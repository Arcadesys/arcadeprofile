/**
 * One-shot: re-trigger AC campaign sync for a list of post ids by touching
 * each post via the Payload update API. The afterChange hook
 * (`syncAcCampaign`) reconciles the AC campaign with `scheduledPublishDate`.
 *
 *   npx tsx scripts/resync-ac-campaigns.ts 3,4,7,43,44,45,46,52,53,54,55,56
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

// Load AC keys from .env.local; load DB URL from .env.production.local
const localEnv = resolve(process.cwd(), '.env.local');
if (existsSync(localEnv)) loadDotenv({ path: localEnv, override: false });
const prodEnv = resolve(process.cwd(), '.env.production.local');
if (existsSync(prodEnv)) loadDotenv({ path: prodEnv, override: false });

async function main(): Promise<void> {
  const idsArg = process.argv[2];
  if (!idsArg) {
    console.error('Usage: resync-ac-campaigns.ts <id,id,...>');
    process.exit(1);
  }
  const ids = idsArg.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));

  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  const payload = await getPayload({ config: configPromise });

  for (const id of ids) {
    const post = await payload.findByID({
      collection: 'posts',
      id,
      depth: 0,
      overrideAccess: true,
    });
    const scheduled = (post as { scheduledPublishDate?: string }).scheduledPublishDate;
    if (!scheduled) {
      console.log(`  post ${id}: no scheduledPublishDate; skipping`);
      continue;
    }
    // Re-write the same value to force the hook to run (it compares previous vs new).
    // Bump the seconds by zero to ensure a write; payload sees scheduledPublishDate
    // re-supplied and the hook fires because previousScheduled may equal it but
    // first-time-run logic also covers the case (we always set it).
    // To force a real diff, briefly write a noop, then the real value.
    await payload.update({
      collection: 'posts',
      id,
      data: { scheduledPublishDate: new Date(new Date(scheduled).getTime() + 1000).toISOString() },
      overrideAccess: true,
      context: { skipNewsletter: true },
    });
    await payload.update({
      collection: 'posts',
      id,
      data: { scheduledPublishDate: scheduled },
      overrideAccess: true,
    });
    console.log(`  post ${id}: re-triggered with scheduledPublishDate=${scheduled}`);
  }

  // Give next/server.after a moment to fire the AC round trips.
  await new Promise((res) => setTimeout(res, 8000));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
