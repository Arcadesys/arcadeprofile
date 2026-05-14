/**
 * Dump every post's SEO/discoverability context to a JSON file so an offline
 * author (the human, or Claude in-conversation) can hand-write the meta fields
 * without spending API tokens. Pair with `apply-post-meta-from-json.ts`.
 *
 * Output shape (data/posts-meta-context.json):
 *   {
 *     posts: [
 *       {
 *         slug, title, excerpt, group: { title, category } | null,
 *         publish_status, bodyExcerpt: string,
 *         needs: { metaTitle, metaDescription, metaKeywords, socialHook, searchSummary },
 *         existing: { meta, discoverability }
 *       }, ...
 *     ]
 *   }
 *
 * Usage:
 *   npm run dump:post-meta
 *   npm run dump:post-meta -- --only-needed
 *   npm run dump:post-meta -- --published-only
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getPayload, type Payload } from 'payload';
import configPromise from '../payload.config';
import type { Post } from '../payload-types';

interface CliArgs {
  onlyNeeded: boolean;
  publishedOnly: boolean;
  out: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { onlyNeeded: false, publishedOnly: false, out: 'data/posts-meta-context.json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only-needed') args.onlyNeeded = true;
    else if (a === '--published-only') args.publishedOnly = true;
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  return false;
}

function lexicalToPlainText(content: unknown, maxChars = 800): string {
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
  const r = await payload.find({
    collection: 'groups',
    where: { slug: { equals: groupSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const g = r.docs[0];
  if (!g) return null;
  return { title: (g.title as string) || groupSlug, category: (g.category as string) || 'writing' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = await getPayload({ config: configPromise });

  const posts: Post[] = [];
  let page = 1;
  while (true) {
    const r = await payload.find({
      collection: 'posts',
      limit: 100,
      page,
      depth: 0,
      sort: '-publishedDate',
      overrideAccess: true,
    });
    posts.push(...(r.docs as Post[]));
    if (!r.hasNextPage) break;
    page++;
  }

  const out: Array<Record<string, unknown>> = [];
  for (const p of posts) {
    const status = p.publish_status as string | null | undefined;
    if (args.publishedOnly && status !== 'published' && status !== 'sent') continue;

    const meta = (p.meta ?? {}) as Record<string, unknown>;
    const disc = (p.discoverability ?? {}) as Record<string, unknown>;
    const needs = {
      metaTitle: isEmpty(meta.title),
      metaDescription: isEmpty(meta.description),
      metaKeywords: isEmpty(meta.keywords),
      socialHook: isEmpty(disc.social_hook),
      searchSummary: isEmpty(disc.search_summary),
    };
    const anyNeeded = Object.values(needs).some(Boolean);
    if (args.onlyNeeded && !anyNeeded) continue;

    const group = await loadGroupContext(payload, typeof p.group === 'string' ? p.group : null);
    out.push({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      publishedDate: p.publishedDate,
      publish_status: status,
      group,
      bodyExcerpt: lexicalToPlainText(p.content, 800),
      needs,
      existing: { meta, discoverability: disc },
    });
  }

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, JSON.stringify({ posts: out }, null, 2));
  console.log(
    `Wrote ${out.length} post(s) to ${args.out}` +
      ` (filters: ${args.onlyNeeded ? 'only-needed ' : ''}${args.publishedOnly ? 'published-only ' : ''}none)`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
