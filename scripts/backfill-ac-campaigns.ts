/**
 * One-shot: provision an AC campaign for every post whose
 * `scheduledPublishDate` is in the future and that has no
 * `acCampaign.campaignId` yet.
 *
 * Dry-run by default — prints the table of posts and the lists each one
 * would target. Pass `--apply` to actually call AC and persist the result
 * onto each post (with `context.skipNewsletter` so the afterChange hook
 * doesn't try to reconcile in a loop).
 *
 *   npx tsx scripts/backfill-ac-campaigns.ts            # dry-run
 *   npx tsx scripts/backfill-ac-campaigns.ts --apply    # commit
 *
 * Suppressed posts (`suppressNewsletter = true`) are skipped — the sync
 * primitive already enforces that, but we filter them out of the report
 * so the dry-run output reads cleanly.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

import { ActiveCampaignError } from '../lib/activecampaign';
import {
  resolveCampaignListIds,
  syncPostCampaign,
  type PostAcCampaignState,
} from '../lib/post-campaign-sync';
import { buildPostNewsletterContent } from '../lib/newsletter';
import { resolveGroupHeroForPost } from '../lib/post-newsletter';
import type { Post } from '../payload-types';

type CliArgs = { apply: boolean };

function parseArgs(argv: string[]): CliArgs {
  return { apply: argv.includes('--apply') };
}

async function loadPayload() {
  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  return getPayload({ config: configPromise });
}

function pad(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length));
}

async function main(): Promise<void> {
  const { apply } = parseArgs(process.argv.slice(2));
  const payload = await loadPayload();

  const nowIso = new Date().toISOString();
  const found = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { scheduledPublishDate: { greater_than: nowIso } },
        { suppressNewsletter: { not_equals: true } },
      ],
    },
    limit: 500,
    depth: 1,
    overrideAccess: true,
    sort: 'scheduledPublishDate',
  });

  const candidates = (found.docs as Post[]).filter((p) => {
    const ac = (p.acCampaign ?? null) as PostAcCampaignState | null;
    return !ac?.campaignId;
  });

  console.log(
    `Found ${candidates.length} future-dated post(s) with no AC campaign yet${apply ? '' : ' (dry-run)'}.`,
  );
  if (candidates.length === 0) return;

  const groupCategoryCache = new Map<string, string | null>();
  async function getGroupCategory(groupSlug: string): Promise<string | null> {
    if (groupCategoryCache.has(groupSlug)) return groupCategoryCache.get(groupSlug)!;
    const gl = await payload.find({
      collection: 'groups',
      where: { slug: { equals: groupSlug } },
      limit: 1,
      overrideAccess: true,
    });
    const cat = (gl.docs[0]?.category as string | undefined) ?? null;
    groupCategoryCache.set(groupSlug, cat);
    return cat;
  }

  let created = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of candidates) {
    const slug = post.slug as string;
    const groupSlug = typeof post.group === 'string' ? post.group : '';
    const groupCategory = groupSlug ? await getGroupCategory(groupSlug) : null;

    let listIds: string[];
    try {
      listIds = resolveCampaignListIds(groupCategory);
    } catch (err) {
      console.log(
        `  ${pad(slug, 40)}  category=${groupCategory ?? '—'}  FAIL list-resolve: ${err instanceof Error ? err.message : err}`,
      );
      failed += 1;
      continue;
    }

    if (!apply) {
      console.log(
        `  ${pad(slug, 40)}  category=${pad(groupCategory ?? '—', 10)}  date=${post.scheduledPublishDate}  lists=${listIds.join(',')}`,
      );
      continue;
    }

    const subject =
      ((post as { newsletterHeading?: string | null }).newsletterHeading || (post.title as string));
    const group = await resolveGroupHeroForPost(payload, post);
    const { htmlBody, textBody } = buildPostNewsletterContent({ ...post, group });
    const scheduledPublishDate = new Date(post.scheduledPublishDate as string);

    const outcome = await syncPostCampaign({
      slug,
      subject,
      htmlBody,
      textBody,
      scheduledPublishDate,
      groupCategory,
      acCampaign: null,
      suppressNewsletter: post.suppressNewsletter ?? undefined,
    });

    if (outcome.kind === 'skipped') {
      console.log(`  ${pad(slug, 40)}  skipped: ${outcome.reason}`);
      skipped += 1;
      continue;
    }
    if (outcome.kind === 'failed') {
      console.log(`  ${pad(slug, 40)}  FAILED: ${outcome.state.lastError}`);
      failed += 1;
    } else {
      console.log(
        `  ${pad(slug, 40)}  ${outcome.kind}: campaign=${outcome.state.campaignId} scheduledFor=${outcome.state.scheduledFor}`,
      );
      created += 1;
    }

    await payload.update({
      collection: 'posts',
      id: post.id,
      context: { skipNewsletter: true },
      data: { acCampaign: outcome.state as Post['acCampaign'] },
    });
  }

  if (apply) {
    console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`);
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
