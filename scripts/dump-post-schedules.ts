/**
 * Dump the 12 stuck posts' (id, slug, scheduledPublishDate, acCampaign)
 * so we can compute the right AC sdate from post state.
 *
 *   DATABASE_URL=... npx tsx scripts/dump-post-schedules.ts
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const localEnv = resolve(process.cwd(), '.env.local');
if (existsSync(localEnv)) loadDotenv({ path: localEnv, override: false });
const prodEnv = resolve(process.cwd(), '.env.production.local');
if (existsSync(prodEnv)) loadDotenv({ path: prodEnv, override: false });

const POST_IDS = [43, 44, 45, 46, 3, 4, 7, 52, 53, 54, 55, 56];

async function main(): Promise<void> {
  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  const payload = await getPayload({ config: configPromise });

  const results: {
    id: number;
    slug: string;
    scheduledPublishDate: string | null;
    campaignId: string | null;
    acScheduledFor: string | null;
    acStatus: string | null;
  }[] = [];

  for (const id of POST_IDS) {
    const post = await payload.findByID({ collection: 'posts', id, overrideAccess: true });
    const ac = (post as { acCampaign?: { campaignId?: string; scheduledFor?: string; status?: string } })
      .acCampaign;
    results.push({
      id: post.id as number,
      slug: (post as { slug?: string }).slug ?? '',
      scheduledPublishDate: (post as { scheduledPublishDate?: string | null }).scheduledPublishDate ?? null,
      campaignId: ac?.campaignId ?? null,
      acScheduledFor: ac?.scheduledFor ?? null,
      acStatus: ac?.status ?? null,
    });
  }

  for (const r of results) {
    console.log(JSON.stringify(r));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
