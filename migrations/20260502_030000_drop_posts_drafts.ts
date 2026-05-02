import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Backfill: any post that was previously published via Payload's draft
  // toggle but never got its workflow status promoted should now show on the
  // public site. Treat _status='published' as the source of truth, then drop
  // the column.
  await db.execute(sql`
    UPDATE "posts"
      SET "publish_status" = 'published'
      WHERE "_status" = 'published'
        AND ("publish_status" IS NULL OR "publish_status" = 'draft');
  `);

  // Drop the version tables (drafts feature is off, so no version history is
  // tracked anymore). CASCADE handles FKs from _posts_v_version_tags.
  await db.execute(sql`
    DROP TABLE IF EXISTS "_posts_v_version_tags" CASCADE;
    DROP TABLE IF EXISTS "_posts_v" CASCADE;

    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "_status";

    DROP TYPE IF EXISTS "public"."enum_posts_status";
    DROP TYPE IF EXISTS "public"."enum__posts_v_version_status";
    DROP TYPE IF EXISTS "public"."enum__posts_v_version_publish_status";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Best-effort restoration — recreates the _status column and the version
  // table skeleton so the schema can be inspected. Does not repopulate any
  // version rows (none were preserved).
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum__posts_v_version_publish_status" AS ENUM('draft', 'scheduled', 'published', 'sent');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "_status" "enum_posts_status" DEFAULT 'draft';

    UPDATE "posts"
      SET "_status" = 'published'
      WHERE "publish_status" IN ('published', 'sent');
  `);
}
