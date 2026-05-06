import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Move every still-pending post's scheduledPublishDate to 10:00 UTC
  // (= 05:00 CDT), matching the new defaultValue in collections/Posts.ts.
  // Already-published / already-sent rows are left alone so we don't
  // rewrite history. Only the time-of-day shifts; the UTC calendar date
  // is preserved (every existing row sits at 13:00–14:00 UTC, well within
  // the same UTC day as 10:00 UTC).
  await db.execute(sql`
    UPDATE "posts"
      SET "scheduled_publish_date" = DATE_TRUNC('day', "scheduled_publish_date") + INTERVAL '10 hours'
      WHERE "scheduled_publish_date" IS NOT NULL
        AND ("publish_status" IS NULL OR "publish_status" NOT IN ('published', 'sent'));
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: previous time was 13:00 UTC for some rows and 14:00 UTC for
  // others, so there's no single value to restore. Adjust by hand if needed.
}
