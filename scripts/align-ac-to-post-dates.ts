/**
 * Push AC sdate to match each post's scheduledPublishDate (08:00 UTC).
 * Only touches posts whose AC sdate currently differs from post date.
 *
 *   npx tsx scripts/align-ac-to-post-dates.ts            # dry-run
 *   npx tsx scripts/align-ac-to-post-dates.ts --apply    # commit
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

const POST_IDS = [43, 44, 45, 46, 3, 4, 7, 52, 53, 54, 55, 56];

function isoAt8UTC(scheduledPublishDate: string): string {
  const d = new Date(scheduledPublishDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8, 0, 0)).toISOString();
}

async function putSdate(
  campaignId: string,
  iso: string,
): Promise<{ ok: boolean; sdate?: string; raw: string }> {
  const url = `${AC_API_URL}/api/3/campaigns/${encodeURIComponent(campaignId)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Api-Token': AC_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ campaign: { sdate: iso } }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, raw: text.slice(0, 400) };
  try {
    const parsed = JSON.parse(text) as { campaign?: { sdate?: string } };
    return { ok: true, sdate: parsed.campaign?.sdate, raw: '' };
  } catch {
    return { ok: false, raw: text.slice(0, 400) };
  }
}

async function main(): Promise<void> {
  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  const payload = await getPayload({ config: configPromise });

  console.log(`\n=== Aligning AC sdate to post.scheduledPublishDate ${apply ? '(APPLY)' : '(dry-run)'} ===`);
  let aligned = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of POST_IDS) {
    const post = (await payload.findByID({ collection: 'posts', id, overrideAccess: true })) as {
      id: number;
      slug?: string;
      scheduledPublishDate?: string | null;
      acCampaign?: { campaignId?: string; scheduledFor?: string };
    };

    const slug = post.slug ?? '';
    const scheduled = post.scheduledPublishDate ?? null;
    const campaignId = post.acCampaign?.campaignId ?? null;
    const currentSdate = post.acCampaign?.scheduledFor ?? null;

    if (!scheduled || !campaignId) {
      console.log(`  SKIP id=${id} (${slug}) - missing scheduledPublishDate or campaignId`);
      skipped++;
      continue;
    }

    const targetIso = isoAt8UTC(scheduled);
    if (currentSdate === targetIso) {
      console.log(`  SKIP id=${id} (${slug}) - already aligned to ${targetIso}`);
      skipped++;
      continue;
    }

    if (!apply) {
      console.log(`  [DRY] id=${id} (${slug}) campaign=${campaignId}: ${currentSdate} -> ${targetIso}`);
      aligned++;
      continue;
    }

    const res = await putSdate(campaignId, targetIso);
    if (!res.ok) {
      console.error(`  FAIL id=${id} (${slug}) campaign=${campaignId}: ${res.raw}`);
      failed++;
      continue;
    }

    await payload.update({
      collection: 'posts',
      id,
      overrideAccess: true,
      context: { skipNewsletter: true },
      data: {
        acCampaign: {
          campaignId,
          status: 'scheduled',
          scheduledFor: targetIso,
          lastError: null,
        } as never,
      },
    });
    console.log(`  OK   id=${id} (${slug}) campaign=${campaignId} sdate -> ${res.sdate}`);
    aligned++;
  }

  console.log(`\nSummary: aligned=${aligned} skipped=${skipped} failed=${failed} ${apply ? '' : '(dry-run)'}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
