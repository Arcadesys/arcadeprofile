import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- groups_chapters array table
    CREATE TABLE IF NOT EXISTS "groups_chapters" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL
    );

    ALTER TABLE "groups_chapters"
      DROP CONSTRAINT IF EXISTS "groups_chapters_parent_id_fk";
    ALTER TABLE "groups_chapters"
      ADD CONSTRAINT "groups_chapters_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."groups"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "groups_chapters_order_idx"
      ON "groups_chapters" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "groups_chapters_parent_id_idx"
      ON "groups_chapters" USING btree ("_parent_id");

    -- chapter text column on posts
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "chapter" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "groups_chapters" CASCADE;

    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "chapter";
  `);
}
