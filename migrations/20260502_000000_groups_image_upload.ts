import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "groups"
      DROP COLUMN IF EXISTS "image";

    ALTER TABLE "groups"
      ADD COLUMN IF NOT EXISTS "image_id" integer;

    ALTER TABLE "groups"
      DROP CONSTRAINT IF EXISTS "groups_image_id_media_id_fk";
    ALTER TABLE "groups"
      ADD CONSTRAINT "groups_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "groups_image_idx"
      ON "groups" USING btree ("image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "groups_image_idx";

    ALTER TABLE "groups"
      DROP CONSTRAINT IF EXISTS "groups_image_id_media_id_fk";

    ALTER TABLE "groups"
      DROP COLUMN IF EXISTS "image_id";

    ALTER TABLE "groups"
      ADD COLUMN IF NOT EXISTS "image" varchar;
  `);
}
