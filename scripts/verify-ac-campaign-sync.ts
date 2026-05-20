/**
 * Verify the AC campaign sync end-to-end.
 *
 * Default (dry-run): no AC writes. Resolves AC_LIST_ID_* env vars, fetches
 * each list's name from AC's v3 API to confirm the env values point at the
 * lists you expect, and prints the predicted list set for a few group
 * categories.
 *
 * Live mode (`--live --slug=<post-slug>`): renders the real newsletter HTML
 * for the named post and creates an AC campaign scheduled one year in the
 * future. AC accepts the campaign but it never delivers within the test
 * window. Inspect it in the AC dashboard to confirm list binding, then
 * delete it by hand. Live mode does NOT update the post's `acCampaign`
 * fields (it bypasses the afterChange hook entirely).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

import {
  ActiveCampaignError,
  createScheduledCampaign,
  getAudienceListId,
  type Audience,
} from '../lib/activecampaign';
import { resolveCampaignListIds } from '../lib/post-campaign-sync';
import { buildPostNewsletterContent } from '../lib/newsletter';
import { resolveGroupHeroForPost } from '../lib/post-newsletter';
import type { Post } from '../payload-types';

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
  }
}

function reportSyntheticRouting(): void {
  console.log('\nSynthetic routing preview (resolveCampaignListIds per category):');
  const samples: Array<{ label: string; category: string | null }> = [
    { label: 'fiction', category: 'fiction' },
    { label: 'writing', category: 'writing' },
    { label: 'tools', category: 'tools' },
    { label: 'experiments', category: 'experiments' },
    { label: 'no-group', category: null },
  ];
  for (const s of samples) {
    try {
      const ids = resolveCampaignListIds(s.category);
      console.log(`  category=${pad(s.label, 12)} → lists ${ids.join(', ')}`);
    } catch (err) {
      console.log(
        `  category=${pad(s.label, 12)} → (missing env: ${err instanceof Error ? err.message : err})`,
      );
    }
  }
}

async function runDryRun(): Promise<void> {
  await reportListResolution();
  reportSyntheticRouting();
}

async function runLive(slug: string): Promise<void> {
  console.log(`Live mode: creating one AC campaign for post "${slug}",`);
  console.log('scheduled 1 year out (will not deliver within the test window).\n');

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

  const listIds = resolveCampaignListIds(groupCategory);
  console.log(
    `\nPredicted lists for "${slug}" (groupCategory=${groupCategory ?? '—'}): ${listIds.join(', ')}\n`,
  );

  const group = await resolveGroupHeroForPost(payload, post);
  const { htmlBody, textBody } = buildPostNewsletterContent({ ...post, group });

  const subject =
    (post as { newsletterHeading?: string | null }).newsletterHeading || post.title;
  const scheduledSendAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const result = await createScheduledCampaign({
    subject,
    htmlBody,
    textBody,
    slug: post.slug as string,
    listIds,
    scheduledSendAt,
  });

  console.log('\nCreate result:');
  console.log(`  campaignId   ${result.campaignId}`);
  console.log(`  messageId    ${result.messageId}`);
  console.log(`  scheduledFor ${result.scheduledFor.toISOString()}`);
  console.log(`  listIds      ${result.listIds.join(', ')}`);
  console.log(
    `\nReminder: this campaign is scheduled for ${scheduledSendAt.toISOString()}.`,
  );
  console.log('Open AC dashboard, confirm list bindings, then delete it.');
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
