/**
 * Backfill Post SEO + discoverability fields for legacy posts.
 *
 * Iterates every post (including drafts) and uses Anthropic Claude to draft any
 * empty `meta.*` and `discoverability.*` fields, then writes them via the
 * Payload local API. Existing field values are never overwritten.
 *
 * Mirrors the constraints baked into `.claude/skills/post/SKILL.md` so
 * backfilled posts are indistinguishable from new posts created via /post.
 *
 * With `--images`, also generates a per-post cover image via Vercel AI Gateway
 * (gpt-image-1) using a per-group visual identity, uploads it to Payload Media,
 * and assigns it to `post.meta.image` — but only for posts that don't already
 * have an image set.
 *
 * Usage:
 *   npm run backfill:post-meta -- --dry-run --limit 3
 *   npm run backfill:post-meta -- --slug some-post-slug
 *   npm run backfill:post-meta -- --images --limit 5
 *   npm run backfill:post-meta
 */
import Anthropic from '@anthropic-ai/sdk';
import { getPayload, type Payload } from 'payload';
import configPromise from '../payload.config';
import type { Post } from '../payload-types';

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  slug: string | null;
  images: boolean;
  skipText: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    limit: null,
    slug: null,
    images: false,
    skipText: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--images') args.images = true;
    else if (a === '--skip-text') args.skipText = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        [
          'backfill-post-meta — fill empty SEO/discoverability fields on existing posts',
          '',
          'Flags:',
          '  --dry-run       Print proposed JSON per post; no DB writes (also skips image generation)',
          '  --limit N       Process at most N posts',
          '  --slug <slug>   Process a single post by slug (drafts included)',
          '  --images        Also generate a cover image per post (Vercel AI Gateway, gpt-image-1)',
          '  --skip-text     Skip text-field backfill (only run image generation; requires --images)',
        ].join('\n'),
      );
      process.exit(0);
    }
  }
  return args;
}

interface DraftedFields {
  meta?: { title?: string; description?: string; keywords?: string };
  discoverability?: {
    social_hook?: string;
    search_summary?: string;
    primaryCTA?: { label: string; href: string; description: string };
  };
}

interface FieldNeeds {
  metaTitle: boolean;
  metaDescription: boolean;
  metaKeywords: boolean;
  socialHook: boolean;
  searchSummary: boolean;
  primaryCTA: boolean;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function diagnoseNeeds(post: Post): FieldNeeds {
  const meta = post.meta ?? {};
  const disc = post.discoverability ?? {};
  const cta = (disc as { primaryCTA?: { label?: string; href?: string } }).primaryCTA ?? {};
  return {
    metaTitle: isEmpty(meta.title),
    metaDescription: isEmpty(meta.description),
    metaKeywords: isEmpty(meta.keywords),
    socialHook: isEmpty(disc.social_hook),
    searchSummary: isEmpty(disc.search_summary),
    primaryCTA: isEmpty(cta.label) || isEmpty(cta.href),
  };
}

function anyNeeded(needs: FieldNeeds): boolean {
  return Object.values(needs).some(Boolean);
}

/** Cheap, dependency-free Lexical → plain-text walker. Truncates aggressively. */
function lexicalToPlainText(content: unknown, maxChars = 3000): string {
  if (!content || typeof content !== 'object') return '';
  const out: string[] = [];
  let total = 0;
  const visit = (node: unknown): void => {
    if (total >= maxChars || !node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; children?: unknown[] };
    if (typeof n.text === 'string') {
      const remaining = maxChars - total;
      const slice = n.text.slice(0, remaining);
      out.push(slice);
      total += slice.length;
    }
    if (Array.isArray(n.children)) {
      for (const c of n.children) visit(c);
      if (n.type === 'paragraph' || n.type === 'heading') {
        out.push('\n');
        total += 1;
      }
    }
  };
  visit((content as { root?: unknown }).root);
  return out.join('').replace(/\n{3,}/g, '\n\n').trim();
}

async function loadGroupContext(
  payload: Payload,
  groupSlug: string | null | undefined,
): Promise<{ title: string; category: string } | null> {
  if (!groupSlug) return null;
  const result = await payload.find({
    collection: 'groups',
    where: { slug: { equals: groupSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const g = result.docs[0];
  if (!g) return null;
  return {
    title: (g.title as string) || groupSlug,
    category: (g.category as string) || 'writing',
  };
}

const SYSTEM_PROMPT = `You write SEO and social metadata for blog posts. Match the post's tone — literary, thoughtful, no marketing fluff. Never use hashtags. Never invent facts not present in the input.

Return STRICT JSON matching this schema (omit any field listed in "skipFields"):

{
  "meta": {
    "title": "string, ≤60 chars, no site name suffix",
    "description": "string, 150–160 chars, plain prose, complete sentences",
    "keywords": "string, comma-separated, 4–8 keywords"
  },
  "discoverability": {
    "social_hook": "string, ≤280 chars, Bluesky/Mastodon teaser, no hashtags",
    "search_summary": "string, 2–3 sentences, front-load main claims",
    "primaryCTA": {
      "label": "string, ≤24 chars",
      "href": "string, path or URL",
      "description": "string, ≤120 chars"
    }
  }
}

For primaryCTA: if the post points at a project/book/page, use that. Otherwise default to {"label":"Subscribe","href":"/subscribe","description":"Get new essays and chapters in your inbox."}.

Output ONLY the JSON object. No prose, no code fences.`;

function buildUserPrompt(args: {
  post: Post;
  group: { title: string; category: string } | null;
  needs: FieldNeeds;
}): string {
  const { post, group, needs } = args;
  const skipFields: string[] = [];
  if (!needs.metaTitle) skipFields.push('meta.title');
  if (!needs.metaDescription) skipFields.push('meta.description');
  if (!needs.metaKeywords) skipFields.push('meta.keywords');
  if (!needs.socialHook) skipFields.push('discoverability.social_hook');
  if (!needs.searchSummary) skipFields.push('discoverability.search_summary');
  if (!needs.primaryCTA) skipFields.push('discoverability.primaryCTA');

  const body = lexicalToPlainText(post.content, 3000);

  return JSON.stringify(
    {
      title: post.title,
      excerpt: post.excerpt,
      group: group ?? null,
      bodyExcerpt: body,
      skipFields,
    },
    null,
    2,
  );
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip code fences if the model added them despite instructions
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

async function draftFields(
  client: Anthropic,
  post: Post,
  group: { title: string; category: string } | null,
  needs: FieldNeeds,
): Promise<DraftedFields> {
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt({ post, group, needs }) }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic response had no text block');
  }
  const parsed = extractJson(textBlock.text) as DraftedFields;
  return parsed;
}

function buildPatch(
  existing: Post,
  drafted: DraftedFields,
  needs: FieldNeeds,
): { meta?: Record<string, unknown>; discoverability?: Record<string, unknown> } {
  const patch: { meta?: Record<string, unknown>; discoverability?: Record<string, unknown> } = {};
  const filledMeta: Record<string, unknown> = { ...(existing.meta ?? {}) };
  const filledDisc: Record<string, unknown> = { ...(existing.discoverability ?? {}) };

  let metaDirty = false;
  let discDirty = false;

  if (needs.metaTitle && drafted.meta?.title) {
    filledMeta.title = drafted.meta.title;
    metaDirty = true;
  }
  if (needs.metaDescription && drafted.meta?.description) {
    filledMeta.description = drafted.meta.description;
    metaDirty = true;
  }
  if (needs.metaKeywords && drafted.meta?.keywords) {
    filledMeta.keywords = drafted.meta.keywords;
    metaDirty = true;
  }
  if (needs.socialHook && drafted.discoverability?.social_hook) {
    filledDisc.social_hook = drafted.discoverability.social_hook;
    discDirty = true;
  }
  if (needs.searchSummary && drafted.discoverability?.search_summary) {
    filledDisc.search_summary = drafted.discoverability.search_summary;
    discDirty = true;
  }
  if (needs.primaryCTA) {
    const cta = drafted.discoverability?.primaryCTA ?? {
      label: 'Subscribe',
      href: '/subscribe',
      description: 'Get new essays and chapters in your inbox.',
    };
    filledDisc.primaryCTA = cta;
    discDirty = true;
  }

  if (metaDirty) patch.meta = filledMeta;
  if (discDirty) patch.discoverability = filledDisc;
  return patch;
}

function describeFilled(needs: FieldNeeds, drafted: DraftedFields): string[] {
  const out: string[] = [];
  if (needs.metaTitle && drafted.meta?.title) out.push('meta.title');
  if (needs.metaDescription && drafted.meta?.description) out.push('meta.description');
  if (needs.metaKeywords && drafted.meta?.keywords) out.push('meta.keywords');
  if (needs.socialHook && drafted.discoverability?.social_hook) out.push('social_hook');
  if (needs.searchSummary && drafted.discoverability?.search_summary) out.push('search_summary');
  if (needs.primaryCTA) out.push('primaryCTA');
  return out;
}

function describeSkipped(needs: FieldNeeds): string[] {
  const out: string[] = [];
  if (!needs.metaTitle) out.push('meta.title');
  if (!needs.metaDescription) out.push('meta.description');
  if (!needs.metaKeywords) out.push('meta.keywords');
  if (!needs.socialHook) out.push('social_hook');
  if (!needs.searchSummary) out.push('search_summary');
  if (!needs.primaryCTA) out.push('primaryCTA');
  return out;
}

// ---------------------------------------------------------------------------
// Cover image generation (per-group visual identity → Vercel AI Gateway)
// ---------------------------------------------------------------------------

interface CategoryStyle {
  style: string;
  palette: string;
  mood: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  fiction: {
    style: 'painterly editorial illustration, soft brushwork, gestural shapes',
    palette: 'warm amber, deep indigo, ivory highlights, charcoal shadow',
    mood: 'literary, atmospheric, evocative of a quiet narrative moment',
  },
  writing: {
    style: 'minimal geometric abstract, generous negative space, subtle texture',
    palette: 'muted teal, ivory, graphite',
    mood: 'thoughtful, essayistic, calm and considered',
  },
  tools: {
    style: 'isometric wireframe, technical line art, precise grid',
    palette: 'electric blue on charcoal, faint cyan accents',
    mood: 'engineered, schematic, deliberately constructed',
  },
  experiments: {
    style: 'glitch-art collage, overlapping channels, mis-registered halftone',
    palette: 'magenta, cyan, jet black, fragments of off-white',
    mood: 'exploratory, slightly chaotic, generative process visible',
  },
  'audio-video': {
    style: 'cinematic still, shallow depth of field, film grain',
    palette: 'desaturated teal and orange, deep blacks',
    mood: 'cinematic, hushed, anamorphic feel',
  },
  community: {
    style: 'soft gradient field, organic flowing shapes, gentle blur',
    palette: 'sunset coral, dusk purple, warm cream',
    mood: 'inviting, human, gathering energy',
  },
};

const DEFAULT_STYLE: CategoryStyle = CATEGORY_STYLES.writing;

function buildImagePrompt(post: Post, group: { title: string; category: string } | null): string {
  const cat = group?.category ?? 'writing';
  const style = CATEGORY_STYLES[cat] ?? DEFAULT_STYLE;
  const subject = post.excerpt?.trim() || post.title;
  return [
    `An abstract editorial cover image evoking: "${post.title}".`,
    `Subject inspiration (do NOT render literally): ${subject}.`,
    `Style: ${style.style}.`,
    `Color palette: ${style.palette}.`,
    `Mood: ${style.mood}.`,
    `Composition: 3:2 landscape, balanced, suitable for an Open Graph card with title text overlaid later — leave the center-left area visually calmer.`,
    `Strict rules: no text, no letters, no logos, no watermarks, no UI elements, no human faces in close-up, no recognizable real people.`,
  ].join(' ');
}

interface GeneratedImage {
  buffer: Buffer;
  mimeType: 'image/png';
  filename: string;
}

async function generateCoverImage(
  post: Post,
  group: { title: string; category: string } | null,
): Promise<GeneratedImage> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is required when --images is set.');
  }
  const prompt = buildImagePrompt(post, group);
  const res = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-image-1',
      prompt,
      size: '1536x1024',
      n: 1,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI Gateway image generation failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = data.data?.[0];
  if (!first) throw new Error('AI Gateway returned no image.');

  let buffer: Buffer;
  if (first.b64_json) {
    buffer = Buffer.from(first.b64_json, 'base64');
  } else if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Image download failed (${imgRes.status})`);
    buffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error('AI Gateway response had neither b64_json nor url.');
  }

  return {
    buffer,
    mimeType: 'image/png',
    filename: `cover-${post.slug}.png`,
  };
}

async function uploadCoverAsMedia(
  payload: Payload,
  image: GeneratedImage,
  alt: string,
): Promise<number> {
  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: {
      data: image.buffer,
      mimetype: image.mimeType,
      name: image.filename,
      size: image.buffer.length,
    },
    overrideAccess: true,
  });
  return created.id as number;
}

async function maybeBackfillImage(args: {
  payload: Payload;
  post: Post;
  dryRun: boolean;
}): Promise<'image-set' | 'image-skipped' | 'image-error'> {
  const { payload, post, dryRun } = args;

  if (post.meta?.image) {
    console.log(`[skip] ${post.slug} | meta.image already set`);
    return 'image-skipped';
  }

  const groupSlug = typeof post.group === 'string' ? post.group : null;
  const group = await loadGroupContext(payload, groupSlug);

  if (dryRun) {
    console.log(`[dry] ${post.slug} | would generate cover image (${group?.category ?? 'writing'} style)`);
    console.log(`        prompt: ${buildImagePrompt(post, group).slice(0, 220)}…`);
    return 'image-set';
  }

  let image: GeneratedImage;
  try {
    image = await generateCoverImage(post, group);
  } catch (err) {
    console.error(`[error] ${post.slug} | image gen failed:`, err instanceof Error ? err.message : err);
    return 'image-error';
  }

  let mediaId: number;
  try {
    mediaId = await uploadCoverAsMedia(payload, image, `Cover image for "${post.title}"`);
  } catch (err) {
    console.error(`[error] ${post.slug} | media upload failed:`, err instanceof Error ? err.message : err);
    return 'image-error';
  }

  try {
    const mergedMeta = { ...(post.meta ?? {}), image: mediaId };
    await payload.update({
      collection: 'posts',
      id: post.id,
      data: { meta: mergedMeta },
      overrideAccess: true,
      context: { skipNewsletter: true },
    });
    console.log(`[write] ${post.slug} | meta.image = media#${mediaId}`);
    return 'image-set';
  } catch (err) {
    console.error(`[error] ${post.slug} | post update failed:`, err instanceof Error ? err.message : err);
    return 'image-error';
  }
}

// ---------------------------------------------------------------------------

async function processPost(args: {
  payload: Payload;
  client: Anthropic;
  post: Post;
  dryRun: boolean;
}): Promise<'updated' | 'skipped' | 'error'> {
  const { payload, client, post, dryRun } = args;
  const needs = diagnoseNeeds(post);

  if (!anyNeeded(needs)) {
    console.log(`[skip] ${post.slug} | already complete`);
    return 'skipped';
  }

  const groupSlug = typeof post.group === 'string' ? post.group : null;
  const groupCtx = await loadGroupContext(payload, groupSlug);

  let drafted: DraftedFields;
  try {
    drafted = await draftFields(client, post, groupCtx, needs);
  } catch (err) {
    console.error(`[error] ${post.slug} | LLM draft failed:`, err instanceof Error ? err.message : err);
    return 'error';
  }

  const patch = buildPatch(post, drafted, needs);
  const filled = describeFilled(needs, drafted);
  const skipped = describeSkipped(needs);

  console.log(
    `[${dryRun ? 'dry' : 'write'}] ${post.slug} | filled: ${filled.join(', ') || '(none)'} | already-set: ${skipped.join(', ') || '(none)'}`,
  );

  if (dryRun) {
    console.log(JSON.stringify(patch, null, 2));
    return 'updated';
  }

  if (!patch.meta && !patch.discoverability) {
    return 'skipped';
  }

  try {
    await payload.update({
      collection: 'posts',
      id: post.id,
      data: patch,
      overrideAccess: true,
      context: { skipNewsletter: true },
    });
    return 'updated';
  } catch (err) {
    console.error(`[error] ${post.slug} | update failed:`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

async function loadPosts(payload: Payload, args: CliArgs): Promise<Post[]> {
  if (args.slug) {
    const result = await payload.find({
      collection: 'posts',
      where: { slug: { equals: args.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return result.docs as Post[];
  }

  const posts: Post[] = [];
  let page = 1;
  while (true) {
    const result = await payload.find({
      collection: 'posts',
      limit: 100,
      page,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: true,
    });
    posts.push(...(result.docs as Post[]));
    if (!result.hasNextPage) break;
    page++;
    if (args.limit && posts.length >= args.limit) break;
  }
  return args.limit ? posts.slice(0, args.limit) : posts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.skipText && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required (omit with --skip-text if running --images only).');
    process.exit(1);
  }
  if (args.images && !args.dryRun && !process.env.AI_GATEWAY_API_KEY) {
    console.error('AI_GATEWAY_API_KEY is required when --images is set without --dry-run.');
    process.exit(1);
  }
  if (args.skipText && !args.images) {
    console.error('--skip-text only makes sense with --images. Aborting.');
    process.exit(1);
  }

  console.log(
    `backfill-post-meta — mode=${args.dryRun ? 'dry-run' : 'write'}` +
      `${args.images ? ' +images' : ''}${args.skipText ? ' (skip-text)' : ''}` +
      `${args.slug ? ` slug=${args.slug}` : ''}${args.limit ? ` limit=${args.limit}` : ''}`,
  );

  const payload = await getPayload({ config: configPromise });
  const client = new Anthropic();
  const posts = await loadPosts(payload, args);
  console.log(`Considering ${posts.length} posts.`);

  const counts = { updated: 0, skipped: 0, error: 0 };
  const imageCounts = { 'image-set': 0, 'image-skipped': 0, 'image-error': 0 };

  for (const post of posts) {
    if (!args.skipText) {
      const outcome = await processPost({ payload, client, post, dryRun: args.dryRun });
      counts[outcome]++;
    }
    if (args.images) {
      // Reload the post after the text update so meta.image check is fresh
      // and we don't clobber the patch we just wrote.
      const fresh = !args.skipText && !args.dryRun
        ? ((await payload.findByID({
            collection: 'posts',
            id: post.id,
            depth: 0,
            overrideAccess: true,
          })) as Post)
        : post;
      const result = await maybeBackfillImage({ payload, post: fresh, dryRun: args.dryRun });
      imageCounts[result]++;
    }
  }

  console.log(`\nDone. text: updated=${counts.updated} skipped=${counts.skipped} error=${counts.error}`);
  if (args.images) {
    console.log(
      `      images: set=${imageCounts['image-set']} skipped=${imageCounts['image-skipped']} error=${imageCounts['image-error']}`,
    );
  }
  const totalErrors = counts.error + imageCounts['image-error'];
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
