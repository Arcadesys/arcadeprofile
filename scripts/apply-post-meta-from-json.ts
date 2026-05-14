/**
 * Apply hand-written SEO meta + discoverability fields from a JSON file.
 * Sibling of `dump-posts-for-meta.ts` — together they let an offline author
 * generate the meta without spending Anthropic API tokens.
 *
 * Writes via Payload's local API with `context: { skipNewsletter: true }` —
 * the official escape hatch documented in collections/Posts.ts:70-76 — so the
 * afterChange newsletter fan-out is bypassed by construction. `revalidatePostPaths`
 * still runs (just Next cache invalidation, safe).
 *
 * Input shape (data/posts-meta-output.json):
 *   {
 *     "<slug>": {
 *       "meta": { "title"?, "description"?, "keywords"? },
 *       "discoverability": { "social_hook"?, "search_summary"? }
 *     },
 *     ...
 *   }
 *
 * Only fields that are CURRENTLY EMPTY on the post are written. Existing
 * non-empty values are never overwritten. Untouched: content, excerpt,
 * publishedDate, publish_status, tags, suppressNewsletter, newsletterSends,
 * meta.image, discoverability.canonical_path, discoverability.primaryCTA.
 *
 * Usage:
 *   npm run apply:post-meta -- --dry-run
 *   npm run apply:post-meta -- --only <slug>
 *   npm run apply:post-meta -- --in data/posts-meta-output.json
 *   npm run apply:post-meta
 */
import { readFileSync } from 'fs';
import { getPayload, type Payload } from 'payload';
import configPromise from '../payload.config';
import type { Post } from '../payload-types';

interface CliArgs {
  dryRun: boolean;
  only: string | null;
  inFile: string;
}

interface InputEntry {
  meta?: { title?: string; description?: string; keywords?: string };
  discoverability?: { social_hook?: string; search_summary?: string };
}

type InputFile = Record<string, InputEntry>;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, only: null, inFile: 'data/posts-meta-output.json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--in') args.inFile = argv[++i];
  }
  return args;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  return false;
}

interface Outcome {
  slug: string;
  status: 'updated' | 'skipped' | 'missing' | 'error';
  filled: string[];
  alreadySet: string[];
  notProvided: string[];
  error?: string;
}

async function processEntry(
  payload: Payload,
  slug: string,
  entry: InputEntry,
  dryRun: boolean,
): Promise<Outcome> {
  const found = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const post = found.docs[0] as Post | undefined;
  if (!post) return { slug, status: 'missing', filled: [], alreadySet: [], notProvided: [] };

  const existingMeta = (post.meta ?? {}) as Record<string, unknown>;
  const existingDisc = (post.discoverability ?? {}) as Record<string, unknown>;
  const filledMeta: Record<string, unknown> = { ...existingMeta };
  const filledDisc: Record<string, unknown> = { ...existingDisc };

  const filled: string[] = [];
  const alreadySet: string[] = [];
  const notProvided: string[] = [];

  const tryFill = (
    bucket: Record<string, unknown>,
    key: string,
    provided: string | undefined,
    label: string,
  ) => {
    if (!isEmpty(bucket[key])) {
      alreadySet.push(label);
      return false;
    }
    if (isEmpty(provided)) {
      notProvided.push(label);
      return false;
    }
    bucket[key] = provided!.trim();
    filled.push(label);
    return true;
  };

  let metaDirty = false;
  let discDirty = false;
  metaDirty = tryFill(filledMeta, 'title', entry.meta?.title, 'meta.title') || metaDirty;
  metaDirty = tryFill(filledMeta, 'description', entry.meta?.description, 'meta.description') || metaDirty;
  metaDirty = tryFill(filledMeta, 'keywords', entry.meta?.keywords, 'meta.keywords') || metaDirty;
  discDirty = tryFill(filledDisc, 'social_hook', entry.discoverability?.social_hook, 'social_hook') || discDirty;
  discDirty =
    tryFill(filledDisc, 'search_summary', entry.discoverability?.search_summary, 'search_summary') ||
    discDirty;

  if (!metaDirty && !discDirty) {
    return { slug, status: 'skipped', filled, alreadySet, notProvided };
  }

  if (dryRun) {
    const patch: Record<string, unknown> = {};
    if (metaDirty) patch.meta = filledMeta;
    if (discDirty) patch.discoverability = filledDisc;
    console.log(`[dry] ${slug} | filled: ${filled.join(', ')} | already-set: ${alreadySet.join(', ') || '(none)'}`);
    console.log(JSON.stringify(patch, null, 2));
    return { slug, status: 'updated', filled, alreadySet, notProvided };
  }

  try {
    const data: Record<string, unknown> = {};
    if (metaDirty) data.meta = filledMeta;
    if (discDirty) data.discoverability = filledDisc;
    await payload.update({
      collection: 'posts',
      id: post.id,
      data,
      overrideAccess: true,
      context: { skipNewsletter: true },
    });
    console.log(`[write] ${slug} | filled: ${filled.join(', ')}`);
    return { slug, status: 'updated', filled, alreadySet, notProvided };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[error] ${slug} | ${msg}`);
    return { slug, status: 'error', filled, alreadySet, notProvided, error: msg };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = readFileSync(args.inFile, 'utf8');
  const input = JSON.parse(raw) as InputFile;

  const payload = await getPayload({ config: configPromise });

  const slugs = args.only ? [args.only] : Object.keys(input);
  const counts = { updated: 0, skipped: 0, missing: 0, error: 0 };

  for (const slug of slugs) {
    const entry = input[slug];
    if (!entry) {
      console.warn(`[warn] ${slug} | not in input file ${args.inFile}`);
      counts.missing++;
      continue;
    }
    const outcome = await processEntry(payload, slug, entry, args.dryRun);
    counts[outcome.status]++;
  }

  console.log(
    `\nDone (${args.dryRun ? 'dry-run' : 'write'}). updated=${counts.updated} skipped=${counts.skipped} missing=${counts.missing} error=${counts.error}`,
  );
  process.exit(counts.error > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
