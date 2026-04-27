import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "show_in_samples" boolean DEFAULT false;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "sample_order" numeric;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "sample_label" varchar;

    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_show_in_samples" boolean DEFAULT false;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_sample_order" numeric;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_sample_label" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_sample_label";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_sample_order";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_show_in_samples";

    ALTER TABLE "posts" DROP COLUMN IF EXISTS "sample_label";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "sample_order";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "show_in_samples";
  `);
}
