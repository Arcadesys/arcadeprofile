import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Backfill: any post that has a scheduledPublishDate but is still in the
  // 'draft' default has a status/date mismatch the cron can't act on. The
  // beforeChange hook in collections/Posts.ts now prevents new rows from
  // landing in this state, but pre-existing rows need a one-shot promotion.
  await db.execute(sql`
    UPDATE "posts"
      SET "publish_status" = 'scheduled'
      WHERE "scheduled_publish_date" IS NOT NULL
        AND ("publish_status" IS NULL OR "publish_status" = 'draft');
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: we won't restore the inconsistent draft + scheduled-date state.
}
