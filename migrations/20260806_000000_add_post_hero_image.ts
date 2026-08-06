import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "hero_image_id" integer;

    ALTER TABLE "posts"
      DROP CONSTRAINT IF EXISTS "posts_hero_image_id_media_id_fk";
    ALTER TABLE "posts"
      ADD CONSTRAINT "posts_hero_image_id_media_id_fk"
      FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "posts_hero_image_idx"
      ON "posts" USING btree ("hero_image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "posts_hero_image_idx";

    ALTER TABLE "posts"
      DROP CONSTRAINT IF EXISTS "posts_hero_image_id_media_id_fk";

    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "hero_image_id";
  `);
}
