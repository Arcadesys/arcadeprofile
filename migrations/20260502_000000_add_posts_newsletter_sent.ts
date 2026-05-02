import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "newsletter_sent" boolean DEFAULT false;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_newsletter_sent" boolean DEFAULT false;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_newsletter_sent";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "newsletter_sent";
  `);
}
