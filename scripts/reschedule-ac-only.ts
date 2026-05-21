/**
 * AC-only sibling of reschedule-ac-v3.ts. PUTs each campaign's sdate via
 * the v3 REST endpoint and prints status. Does not touch Payload, so it
 * works without DATABASE_URL.
 *
 *   npx tsx scripts/reschedule-ac-only.ts            # dry-run
 *   npx tsx scripts/reschedule-ac-only.ts --apply    # commit
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
  campaignId: string;
  slug: string;
  scheduledIso: string;
}

const TARGETS: Target[] = [
  { campaignId: '165', slug: 'gallery-view-4-safe-hour-at-the-bar', scheduledIso: '2026-05-22T08:00:00.000Z' },
  { campaignId: '169', slug: 'gallery-view-5-breadcrumbs',          scheduledIso: '2026-05-25T08:00:00.000Z' },
  { campaignId: '170', slug: 'gallery-view-6-stack-trace',          scheduledIso: '2026-05-27T08:00:00.000Z' },
  { campaignId: '173', slug: 'gallery-view-7-gallery-view',         scheduledIso: '2026-05-29T08:00:00.000Z' },
  { campaignId: '168', slug: 'the-hidden-tax-on-senior-engineers',  scheduledIso: '2026-05-28T08:00:00.000Z' },
  { campaignId: '172', slug: 'the-photograph-of-a-river',           scheduledIso: '2026-06-02T08:00:00.000Z' },
  { campaignId: '167', slug: 'why-the-10-percent-productivity-plateau-should-worry-you', scheduledIso: '2026-05-26T08:00:00.000Z' },
  { campaignId: '171', slug: 'early-days',                          scheduledIso: '2026-06-09T08:00:00.000Z' },
  { campaignId: '175', slug: 'wicked-little-town',                  scheduledIso: '2026-06-23T08:00:00.000Z' },
  { campaignId: '177', slug: 'beneath-these-bones',                 scheduledIso: '2026-06-25T08:00:00.000Z' },
  { campaignId: '180', slug: 'letters-and-the-sun-on-my-face',      scheduledIso: '2026-06-30T08:00:00.000Z' },
  { campaignId: '181', slug: 'a-fucking-riot',                      scheduledIso: '2026-07-02T08:00:00.000Z' },
];

interface AcResp {
  campaign?: { id?: string; sdate?: string; status?: string };
}

async function putSdate(t: Target): Promise<{ ok: boolean; sdate?: string; status?: string; raw: string }> {
  const url = `${AC_API_URL}/api/3/campaigns/${encodeURIComponent(t.campaignId)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Api-Token': AC_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ campaign: { sdate: t.scheduledIso } }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, raw: text.slice(0, 400) };
  try {
    const parsed = JSON.parse(text) as AcResp;
    return { ok: true, sdate: parsed.campaign?.sdate, status: parsed.campaign?.status, raw: '' };
  } catch {
    return { ok: false, raw: text.slice(0, 400) };
  }
}

async function main(): Promise<void> {
  console.log(`\n=== AC-only reschedule of ${TARGETS.length} campaigns ${apply ? '(APPLY)' : '(dry-run)'} ===`);
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
    console.log(`  OK   campaign=${t.campaignId} (${t.slug}) sdate=${res.sdate} status=${res.status}`);
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
