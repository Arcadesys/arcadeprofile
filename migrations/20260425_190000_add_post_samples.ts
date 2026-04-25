import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN "show_in_samples" boolean DEFAULT false;
    ALTER TABLE "posts" ADD COLUMN "sample_order" numeric;
    ALTER TABLE "posts" ADD COLUMN "sample_label" varchar;

    ALTER TABLE "_posts_v" ADD COLUMN "version_show_in_samples" boolean DEFAULT false;
    ALTER TABLE "_posts_v" ADD COLUMN "version_sample_order" numeric;
    ALTER TABLE "_posts_v" ADD COLUMN "version_sample_label" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_posts_v" DROP COLUMN "version_sample_label";
    ALTER TABLE "_posts_v" DROP COLUMN "version_sample_order";
    ALTER TABLE "_posts_v" DROP COLUMN "version_show_in_samples";

    ALTER TABLE "posts" DROP COLUMN "sample_label";
    ALTER TABLE "posts" DROP COLUMN "sample_order";
    ALTER TABLE "posts" DROP COLUMN "show_in_samples";
  `);
}
