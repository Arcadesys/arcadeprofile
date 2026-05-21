/**
 * One-shot: reschedule AC campaigns via the v3 REST PUT endpoint, then
 * clear the failed state in Payload. The legacy `campaign_save` path
 * in lib/activecampaign.ts is currently returning "You are not authorized
 * to access this file" so we bypass it.
 *
 *   npx tsx scripts/reschedule-ac-v3.ts            # dry-run
 *   npx tsx scripts/reschedule-ac-v3.ts --apply    # commit
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const localEnv = resolve(process.cwd(), '.env.local');
if (existsSync(localEnv)) loadDotenv({ path: localEnv, override: false });
const prodEnv = resolve(process.cwd(), '.env.production.local');
if (existsSync(prodEnv)) loadDotenv({ path: prodEnv, override: false });

const apply = process.argv.includes('--apply');

const AC_API_URL = process.env.AC_API_URL ?? '';
const AC_API_KEY = process.env.AC_API_KEY ?? '';
if (!AC_API_URL || !AC_API_KEY) {
  console.error('Missing AC_API_URL or AC_API_KEY');
  process.exit(1);
}

interface Target {
  postId: number;
  campaignId: string;
  slug: string;
  scheduledIso: string; // UTC ISO at 08:00Z
}

const TARGETS: Target[] = [
  { postId: 43, campaignId: '165', slug: 'gallery-view-4-safe-hour-at-the-bar', scheduledIso: '2026-05-22T08:00:00.000Z' },
  { postId: 44, campaignId: '169', slug: 'gallery-view-5-breadcrumbs',          scheduledIso: '2026-05-25T08:00:00.000Z' },
  { postId: 45, campaignId: '170', slug: 'gallery-view-6-stack-trace',          scheduledIso: '2026-05-27T08:00:00.000Z' },
  { postId: 46, campaignId: '173', slug: 'gallery-view-7-gallery-view',         scheduledIso: '2026-05-29T08:00:00.000Z' },
  { postId: 3,  campaignId: '168', slug: 'the-hidden-tax-on-senior-engineers',  scheduledIso: '2026-05-28T08:00:00.000Z' },
  { postId: 4,  campaignId: '172', slug: 'the-photograph-of-a-river',           scheduledIso: '2026-06-02T08:00:00.000Z' },
  { postId: 7,  campaignId: '167', slug: 'why-the-10-percent-productivity-plateau-should-worry-you', scheduledIso: '2026-05-26T08:00:00.000Z' },
  { postId: 52, campaignId: '171', slug: 'early-days',                          scheduledIso: '2026-06-09T08:00:00.000Z' },
  { postId: 53, campaignId: '175', slug: 'wicked-little-town',                  scheduledIso: '2026-06-23T08:00:00.000Z' },
  { postId: 54, campaignId: '177', slug: 'beneath-these-bones',                 scheduledIso: '2026-06-25T08:00:00.000Z' },
  { postId: 55, campaignId: '180', slug: 'letters-and-the-sun-on-my-face',      scheduledIso: '2026-06-30T08:00:00.000Z' },
  { postId: 56, campaignId: '181', slug: 'a-fucking-riot',                      scheduledIso: '2026-07-02T08:00:00.000Z' },
];

interface AcResp {
  campaign?: { id?: string; sdate?: string; status?: string };
}

async function putSdate(target: Target): Promise<{ ok: boolean; sdate?: string; raw: string }> {
  const url = `${AC_API_URL}/api/3/campaigns/${encodeURIComponent(target.campaignId)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Api-Token': AC_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ campaign: { sdate: target.scheduledIso } }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, raw: text.slice(0, 400) };
  try {
    const parsed = JSON.parse(text) as AcResp;
    return { ok: true, sdate: parsed.campaign?.sdate, raw: '' };
  } catch {
    return { ok: false, raw: text.slice(0, 400) };
  }
}

async function clearPayloadFailedState(target: Target): Promise<void> {
  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  const payload = await getPayload({ config: configPromise });
  await payload.update({
    collection: 'posts',
    id: target.postId,
    overrideAccess: true,
    context: { skipNewsletter: true },
    data: {
      acCampaign: {
        campaignId: target.campaignId,
        status: 'scheduled',
        scheduledFor: target.scheduledIso,
        lastError: null,
      } as never,
    },
  });
}

async function main(): Promise<void> {
  console.log(`\n=== Rescheduling ${TARGETS.length} AC campaigns ${apply ? '(APPLY)' : '(dry-run)'} ===`);
  let ok = 0;
  let fail = 0;
  for (const t of TARGETS) {
    if (!apply) {
      console.log(`  [DRY] campaign=${t.campaignId} (${t.slug}) → sdate=${t.scheduledIso}`);
      continue;
    }
    const res = await putSdate(t);
    if (!res.ok) {
      console.error(`  FAIL campaign=${t.campaignId} (${t.slug}): ${res.raw}`);
      fail++;
      continue;
    }
    try {
      await clearPayloadFailedState(t);
    } catch (err) {
      console.error(
        `  campaign=${t.campaignId} AC ok but Payload clear failed:`,
        err instanceof Error ? err.message : err,
      );
    }
    console.log(`  OK   campaign=${t.campaignId} (${t.slug}) sdate=${res.sdate}`);
    ok++;
  }
  console.log(`\nSummary: ok=${ok} fail=${fail} ${apply ? '' : '(dry-run; pass --apply to commit)'}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
