/**
 * Verify the fiction/essays AC fan-out end-to-end.
 *
 * Default (dry-run): no AC sends. Resolves AC_LIST_ID_* env vars, fetches each
 * list's name from AC's v3 API to confirm the env values point at the lists
 * you expect, then loads one fiction post and one non-fiction post from
 * Payload and prints the predicted audience routing.
 *
 * Live mode (`--live --slug=<post-slug>`): renders the real newsletter HTML
 * for the named post and runs the production fan-out, but sets
 * `scheduledSendAt` one year in the future. AC creates the campaigns; they
 * never deliver. Inspect them in the AC dashboard to confirm list binding,
 * then delete them by hand. Live mode does NOT update `newsletterSent` on
 * the post (it bypasses the afterChange hook entirely).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

// AC_API_URL / AC_API_KEY typically live in Vercel Production env, not
// .env.local. Layer .env.production.local on top of .env.local (without
// overriding values already set) so the script can run against production
// AC creds when the user has pulled them via `vercel env pull --environment=production`.
const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

import {
  ActiveCampaignError,
  getAudienceListId,
  type Audience,
} from '../lib/activecampaign';
import {
  resolveAudiences,
  sendPostNewsletterFanOut,
} from '../lib/post-newsletter-fanout';
import { buildPostNewsletterContent } from '../lib/newsletter';
import { resolveGroupHeroForPost } from '../lib/post-newsletter';
import type { Post } from '../payload-types';

// Lazy-import Payload only when needed so the dry-run can short-circuit when
// DATABASE_URL isn't set locally (the common case for this repo's dev workflow).
async function loadPayload() {
  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  return getPayload({ config: configPromise });
}

const AUDIENCES: Audience[] = ['all', 'fiction', 'essays'];
const ENV_NAME: Record<Audience, string> = {
  all: 'AC_LIST_ID_ALL_PERPOST',
  fiction: 'AC_LIST_ID_FICTION_PERPOST',
  essays: 'AC_LIST_ID_ESSAYS_PERPOST',
};

type CliArgs = {
  live: boolean;
  slug: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { live: false, slug: null };
  for (const a of argv) {
    if (a === '--live') args.live = true;
    else if (a === '--dry-run') args.live = false;
    else if (a.startsWith('--slug=')) args.slug = a.slice('--slug='.length);
  }
  return args;
}

function getApiBaseUrlOrNull(): string | null {
  const raw = (process.env.AC_API_URL || process.env.ACTIVECAMPAIGN_API_URL || '').trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

function getApiKeyOrNull(): string | null {
  const key = (process.env.AC_API_KEY || process.env.ACTIVECAMPAIGN_API_KEY || '').trim();
  return key || null;
}

async function fetchListName(
  listId: string,
  baseUrl: string,
  apiKey: string,
): Promise<string> {
  const url = `${baseUrl}/api/3/lists/${encodeURIComponent(listId)}`;
  const res = await fetch(url, {
    headers: { 'Api-Token': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `AC GET /api/3/lists/${listId} failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }
  const json = (await res.json()) as { list?: { name?: string } };
  return json.list?.name?.trim() || '(unnamed)';
}

function pad(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length));
}

async function reportListResolution(): Promise<void> {
  console.log('AC list resolution:');
  const baseUrl = getApiBaseUrlOrNull();
  const apiKey = getApiKeyOrNull();
  const canFetchNames = Boolean(baseUrl && apiKey);

  const rows: Array<{ envName: string; id: string; name: string | null }> = [];
  for (const audience of AUDIENCES) {
    const envName = ENV_NAME[audience];
    let id: string;
    try {
      id = getAudienceListId(audience);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${pad(envName, 28)} = (missing) — ${msg}`);
      throw err;
    }
    let name: string | null = null;
    if (canFetchNames) {
      try {
        name = await fetchListName(id, baseUrl!, apiKey!);
      } catch (err) {
        name = `(fetch failed: ${err instanceof Error ? err.message : String(err)})`;
      }
    }
    rows.push({ envName, id, name });
  }
  for (const r of rows) {
    if (r.name) {
      console.log(`  ${pad(r.envName, 28)} = ${pad(r.id, 4)} → "${r.name}"`);
    } else {
      console.log(`  ${pad(r.envName, 28)} = ${r.id}`);
    }
  }
  if (!canFetchNames) {
    console.log(
      '\n  (AC_API_KEY/AC_API_URL not set locally — skipping list-name confirmation.)',
    );
    console.log(
      '  Vercel marks AC_API_KEY as Sensitive, so `vercel env pull` returns it empty.',
    );
    console.log(
      '  To enable name confirmation, add AC_API_KEY and AC_API_URL to .env.local manually.',
    );
  }
}

type PayloadInstance = Awaited<ReturnType<typeof loadPayload>>;

type PostWithGroupCategory = {
  post: Post;
  groupCategory: string | null;
  groupSlug: string | null;
};

async function findRecentPostByGroupCategory(
  payload: PayloadInstance,
  match: 'fiction' | 'non-fiction',
): Promise<PostWithGroupCategory | null> {
  // Find groups whose category is fiction (or not), then pull the most recent
  // published post that belongs to one of them. Posts.group is stored as the
  // group slug string, so we match by slug.
  const groupQuery =
    match === 'fiction'
      ? { category: { equals: 'fiction' } }
      : { category: { not_equals: 'fiction' } };
  const groups = await payload.find({
    collection: 'groups',
    where: groupQuery,
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const groupSlugs = groups.docs
    .map((g: any) => (typeof g.slug === 'string' ? g.slug : null))
    .filter((s: string | null): s is string => Boolean(s));
  if (groupSlugs.length === 0) return null;

  const posts = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { publish_status: { in: ['published', 'sent'] } },
        { group: { in: groupSlugs } },
      ],
    },
    sort: '-publishedDate',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const post = posts.docs[0] as Post | undefined;
  if (!post) return null;

  const groupSlug = typeof post.group === 'string' ? post.group : null;
  const matched = groups.docs.find((g: any) => g.slug === groupSlug) as
    | { category?: string | null }
    | undefined;
  return {
    post,
    groupCategory: (matched?.category as string | undefined) ?? null,
    groupSlug,
  };
}

async function reportRoutingPreview(payload: PayloadInstance): Promise<void> {
  console.log('\nRouting preview (latest published posts):');

  const fiction = await findRecentPostByGroupCategory(payload, 'fiction');
  const essay = await findRecentPostByGroupCategory(payload, 'non-fiction');

  for (const [label, found] of [
    ['fiction', fiction],
    ['essay  ', essay],
  ] as const) {
    if (!found) {
      console.log(`  ${label}: (none found)`);
      continue;
    }
    const audiences = resolveAudiences(found.groupCategory);
    const routing = audiences
      .map((a) => {
        try {
          return `${a} (${getAudienceListId(a)})`;
        } catch {
          return `${a} (missing env)`;
        }
      })
      .join(', ');
    console.log(
      `  ${label}: "${found.post.slug}" (group: ${found.groupSlug ?? '—'}, category: ${found.groupCategory ?? '—'})`,
    );
    console.log(`    → [${routing}]`);
  }
}

function reportSyntheticRouting(): void {
  console.log('\nSynthetic routing preview (resolveAudiences for each category):');
  const samples: Array<{ label: string; category: string | null }> = [
    { label: 'fiction', category: 'fiction' },
    { label: 'writing', category: 'writing' },
    { label: 'tools', category: 'tools' },
    { label: 'experiments', category: 'experiments' },
    { label: 'audio-video', category: 'audio-video' },
    { label: 'community', category: 'community' },
    { label: 'no-group', category: null },
  ];
  for (const s of samples) {
    const audiences = resolveAudiences(s.category);
    const routing = audiences
      .map((a) => {
        try {
          return `${a} (${getAudienceListId(a)})`;
        } catch {
          return `${a} (missing env)`;
        }
      })
      .join(', ');
    console.log(`  category=${pad(s.label, 12)} → [${routing}]`);
  }
}

async function runDryRun(): Promise<void> {
  await reportListResolution();

  // Routing preview against real DB is best-effort: this repo's local dev
  // workflow doesn't always have a live Postgres connection (Vercel Postgres
  // creds are Sensitive and aren't pulled by `vercel env pull`). Fall back to
  // a synthetic preview so the dry-run is still useful from a laptop.
  const hasDb = Boolean(process.env.DATABASE_URL || process.env.DATABASE_URI);
  if (!hasDb) {
    console.log(
      '\n  (DATABASE_URL not set locally — skipping live post lookup, showing synthetic routing instead.)',
    );
    reportSyntheticRouting();
    return;
  }

  try {
    const payload = await loadPayload();
    await reportRoutingPreview(payload);
  } catch (err) {
    console.log(
      `\n  (Payload boot failed: ${err instanceof Error ? err.message : String(err)})`,
    );
    console.log('  Falling back to synthetic routing preview.');
    reportSyntheticRouting();
  }
}

async function runLive(slug: string): Promise<void> {
  console.log(`Live mode: rendering and fanning out post "${slug}" with`);
  console.log('scheduledSendAt set 1 year out (campaigns will be created but');
  console.log('not delivered). Inspect and delete in AC dashboard when done.\n');

  await reportListResolution();

  const payload = await loadPayload();
  const found = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const post = found.docs[0] as Post | undefined;
  if (!post) throw new Error(`No post with slug "${slug}"`);

  let groupCategory: string | null = null;
  if (typeof post.group === 'string' && post.group) {
    const gl = await payload.find({
      collection: 'groups',
      where: { slug: { equals: post.group } },
      limit: 1,
      overrideAccess: true,
    });
    groupCategory = (gl.docs[0]?.category as string | undefined) ?? null;
  }

  const group = await resolveGroupHeroForPost(payload, post);
  const { htmlBody, textBody } = buildPostNewsletterContent({ ...post, group });

  const subject = (post as any).newsletterHeading || post.title;
  const scheduledSendAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  console.log(
    `\nPredicted routing for "${slug}" (groupCategory=${groupCategory ?? '—'}): ${resolveAudiences(groupCategory).join(', ')}\n`,
  );

  const result = await sendPostNewsletterFanOut({
    subject,
    htmlBody,
    textBody,
    slug: post.slug as string,
    scheduledSendAt,
    groupCategory,
  });

  console.log('\nFan-out result:');
  for (const r of result.results) {
    let listId = '?';
    try {
      listId = getAudienceListId(r.audience);
    } catch {
      // already-printed missing-env error; leave as ?
    }
    console.log(
      `  ${pad(r.audience, 8)} → list ${listId}, message ${r.messageId}, campaign ${r.campaignId}`,
    );
  }
  for (const f of result.failures) {
    const err = f.error;
    const status = err instanceof ActiveCampaignError ? err.causeStatus : undefined;
    const detail = err instanceof ActiveCampaignError ? err.details : undefined;
    console.log(
      `  ${pad(f.audience, 8)} → FAILED: ${err instanceof Error ? err.message : String(err)}` +
        (status !== undefined ? ` (HTTP ${status})` : '') +
        (detail ? ` | ${detail}` : ''),
    );
  }

  console.log(
    `\nReminder: these campaigns are scheduled for ${scheduledSendAt.toISOString()}.`,
  );
  console.log('Open AC dashboard, confirm each campaign is bound to the right');
  console.log('list, then delete them.');

  if (!result.allSucceeded) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.live) {
    if (!args.slug) {
      throw new Error('Live mode requires --slug=<post-slug>');
    }
    await runLive(args.slug);
  } else {
    await runDryRun();
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    if (err instanceof ActiveCampaignError && err.details) {
      console.error(`AC detail: ${err.details}`);
    }
    process.exit(1);
  });
