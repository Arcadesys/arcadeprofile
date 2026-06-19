import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "_posts_v"
      DROP COLUMN IF EXISTS "version_sample_label",
      DROP COLUMN IF EXISTS "version_sample_order",
      DROP COLUMN IF EXISTS "version_show_in_samples";

    ALTER TABLE IF EXISTS "posts"
      DROP COLUMN IF EXISTS "sample_label",
      DROP COLUMN IF EXISTS "sample_order",
      DROP COLUMN IF EXISTS "show_in_samples";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "posts"
      ADD COLUMN IF NOT EXISTS "show_in_samples" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "sample_order" numeric,
      ADD COLUMN IF NOT EXISTS "sample_label" varchar;

    ALTER TABLE IF EXISTS "_posts_v"
      ADD COLUMN IF NOT EXISTS "version_show_in_samples" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_sample_order" numeric,
      ADD COLUMN IF NOT EXISTS "version_sample_label" varchar;
  `);
}
