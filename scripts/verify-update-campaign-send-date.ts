/**
 * Verify the v3-PUT rewrite of updateCampaignSendDate works against the
 * live AC account by re-setting the sdate of an already-scheduled campaign
 * to the same value it already has. Read-only in effect; just exercises
 * the new code path end-to-end.
 *
 *   npx tsx scripts/verify-update-campaign-send-date.ts <campaignId>
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const localEnv = resolve(process.cwd(), '.env.local');
if (existsSync(localEnv)) loadDotenv({ path: localEnv, override: false });
const prodEnv = resolve(process.cwd(), '.env.production.local');
if (existsSync(prodEnv)) loadDotenv({ path: prodEnv, override: false });

async function main(): Promise<void> {
  const campaignId = process.argv[2];
  if (!campaignId) {
    console.error('usage: tsx scripts/verify-update-campaign-send-date.ts <campaignId>');
    process.exit(1);
  }

  const { getCampaignStatus, updateCampaignSendDate, isCampaignFrozen } = await import(
    '../lib/activecampaign'
  );

  const before = await getCampaignStatus({ campaignId });
  console.log(`status code before: ${before.status} (raw=${before.raw})`);
  if (isCampaignFrozen(before.status)) {
    console.error('campaign is frozen (status >= 2); refusing to touch it');
    process.exit(2);
  }

  const apiUrl = process.env.AC_API_URL ?? '';
  const apiKey = process.env.AC_API_KEY ?? '';
  const lookup = await fetch(
    `${apiUrl}/api/3/campaigns/${encodeURIComponent(campaignId)}`,
    { headers: { 'Api-Token': apiKey, Accept: 'application/json' } },
  );
  const lookupJson = (await lookup.json()) as { campaign?: { sdate?: string } };
  const existingSdate = lookupJson.campaign?.sdate ?? '';
  console.log(`existing sdate: ${existingSdate}`);
  if (!existingSdate) {
    console.error('no existing sdate; aborting');
    process.exit(3);
  }

  const sendAt = new Date(existingSdate);
  console.log(`calling updateCampaignSendDate with sendAt=${sendAt.toISOString()}`);
  const result = await updateCampaignSendDate({ campaignId, scheduledSendAt: sendAt });
  console.log(`returned scheduledFor: ${result.scheduledFor.toISOString()}`);

  const after = await getCampaignStatus({ campaignId });
  console.log(`status code after: ${after.status} (raw=${after.raw})`);
  console.log('PASS');
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err);
  if (err && typeof err === 'object' && 'detail' in err) {
    console.error('detail:', (err as { detail?: unknown }).detail);
  }
  process.exit(1);
});
