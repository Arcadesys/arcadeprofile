import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "pdf_edition_id" integer;
    DO $$ BEGIN
      ALTER TABLE "posts" ADD CONSTRAINT "posts_pdf_edition_id_media_id_fk"
        FOREIGN KEY ("pdf_edition_id") REFERENCES "media"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_pdf_edition_id_media_id_fk";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "pdf_edition_id";
  `);
}
