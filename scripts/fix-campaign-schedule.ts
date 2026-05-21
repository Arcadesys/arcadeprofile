/**
 * One-shot: realign upcoming scheduled posts onto the correct
 * Mon/Wed/Fri (fiction) and Tue/Thu (essay) slots at 08:00 UTC,
 * and fix the pride-essays group category + stale numeric `group="5"`
 * references.
 *
 *   npx tsx scripts/fix-campaign-schedule.ts            # dry-run
 *   npx tsx scripts/fix-campaign-schedule.ts --apply    # commit
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}
const productionSavePath = resolve(process.cwd(), '.env.production.local.save');
if (existsSync(productionSavePath)) {
  loadDotenv({ path: productionSavePath, override: false });
}

type CliArgs = { apply: boolean };
function parseArgs(argv: string[]): CliArgs {
  return { apply: argv.includes('--apply') };
}

interface PostFix {
  id: number;
  slug: string;
  scheduledIso: string; // 08:00 UTC
}

const FICTION_FIXES: PostFix[] = [
  { id: 43, slug: 'gallery-view-4-safe-hour-at-the-bar', scheduledIso: '2026-05-22T08:00:00.000Z' }, // Fri
  { id: 44, slug: 'gallery-view-5-breadcrumbs',          scheduledIso: '2026-05-25T08:00:00.000Z' }, // Mon
  { id: 45, slug: 'gallery-view-6-stack-trace',          scheduledIso: '2026-05-27T08:00:00.000Z' }, // Wed
  { id: 46, slug: 'gallery-view-7-gallery-view',         scheduledIso: '2026-05-29T08:00:00.000Z' }, // Fri
];

const ESSAY_FIXES: PostFix[] = [
  { id: 3,  slug: 'the-hidden-tax-on-senior-engineers',         scheduledIso: '2026-05-28T08:00:00.000Z' }, // Thu
  { id: 4,  slug: 'the-photograph-of-a-river',                  scheduledIso: '2026-06-02T08:00:00.000Z' }, // Tue
  { id: 7,  slug: 'why-the-10-percent-productivity-plateau-should-worry-you', scheduledIso: '2026-05-26T08:00:00.000Z' }, // Tue (only group fix needed; time also)
  { id: 52, slug: 'early-days',                                 scheduledIso: '2026-06-09T08:00:00.000Z' }, // Tue
  { id: 53, slug: 'wicked-little-town',                         scheduledIso: '2026-06-23T08:00:00.000Z' }, // Tue
  { id: 54, slug: 'beneath-these-bones',                        scheduledIso: '2026-06-25T08:00:00.000Z' }, // Thu
  { id: 55, slug: 'letters-and-the-sun-on-my-face',             scheduledIso: '2026-06-30T08:00:00.000Z' }, // Tue
  { id: 56, slug: 'a-fucking-riot',                             scheduledIso: '2026-07-02T08:00:00.000Z' }, // Thu
];

// Posts that need group slug fix from numeric "5" → "the-singularity-log"
const GROUP_SLUG_FIXES: number[] = [3, 4, 7];

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

  console.log(`\n=== Phase 1: Group fixes ${apply ? '(APPLY)' : '(dry-run)'} ===`);

  // 1a. Set pride-essays group category to 'writing'
  const prideGroup = await payload.find({
    collection: 'groups',
    where: { slug: { equals: 'pride-essays' } },
    limit: 1,
    overrideAccess: true,
  });
  const prideDoc = prideGroup.docs[0] as { id: number; category?: string | null } | undefined;
  if (!prideDoc) {
    console.log('  pride-essays group not found — skipping category fix');
  } else if (prideDoc.category === 'writing') {
    console.log('  pride-essays already has category=writing — skipping');
  } else {
    console.log(`  pride-essays.category: ${prideDoc.category ?? '(null)'} → writing`);
    if (apply) {
      await payload.update({
        collection: 'groups',
        id: prideDoc.id,
        data: { category: 'writing' },
        overrideAccess: true,
      });
    }
  }

  // 1b. Fix posts whose group field is the numeric string "5"
  for (const id of GROUP_SLUG_FIXES) {
    const post = await payload.findByID({
      collection: 'posts',
      id,
      depth: 0,
      overrideAccess: true,
    });
    const currentGroup = (post as { group?: string }).group;
    if (currentGroup === 'the-singularity-log') {
      console.log(`  post ${id} group already 'the-singularity-log' — skipping`);
      continue;
    }
    console.log(`  post ${id} group: ${currentGroup ?? '(null)'} → the-singularity-log`);
    if (apply) {
      await payload.update({
        collection: 'posts',
        id,
        data: { group: 'the-singularity-log' },
        overrideAccess: true,
        // skip newsletter sync here; phase 2 will re-trigger via date update
        context: { skipNewsletter: true },
      });
    }
  }

  console.log(`\n=== Phase 2: Schedule realignment ${apply ? '(APPLY)' : '(dry-run)'} ===`);
  const all: Array<{ lane: string; fix: PostFix }> = [
    ...FICTION_FIXES.map((fix) => ({ lane: 'FICTION', fix })),
    ...ESSAY_FIXES.map((fix) => ({ lane: 'ESSAY  ', fix })),
  ];

  let changed = 0;
  let unchanged = 0;
  for (const { lane, fix } of all) {
    const post = await payload.findByID({
      collection: 'posts',
      id: fix.id,
      depth: 0,
      overrideAccess: true,
    });
    const currentIso = (post as { scheduledPublishDate?: string | null }).scheduledPublishDate ?? null;
    const status = (post as { publish_status?: string }).publish_status;
    const targetIso = fix.scheduledIso;

    // normalize: compare instants
    const currentMs = currentIso ? new Date(currentIso).getTime() : NaN;
    const targetMs = new Date(targetIso).getTime();
    const matches = Number.isFinite(currentMs) && currentMs === targetMs && status === 'scheduled';

    const targetWhen = new Date(targetIso).toUTCString();
    if (matches) {
      console.log(`  ${lane}  ${pad(fix.slug, 50)}  unchanged @ ${targetWhen}`);
      unchanged++;
      continue;
    }
    console.log(
      `  ${lane}  ${pad(fix.slug, 50)}  ${currentIso ?? '(none)'} → ${targetIso}`,
    );
    if (apply) {
      await payload.update({
        collection: 'posts',
        id: fix.id,
        data: {
          scheduledPublishDate: targetIso,
          publish_status: 'scheduled',
        },
        overrideAccess: true,
      });
    }
    changed++;
  }

  console.log(`\nSummary: changed=${changed} unchanged=${unchanged} ${apply ? '' : '(dry-run; pass --apply to commit)'}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
