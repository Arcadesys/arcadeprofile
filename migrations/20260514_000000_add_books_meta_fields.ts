import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Add `meta` group fields to the Books collection so each book can supply
 * its own OG title / description / image / keywords for link unfurls.
 *
 * Mirrors the existing meta column shape on Posts, Groups, Pages
 * (meta_title varchar, meta_description varchar, meta_image_id integer FK
 * to media, meta_keywords varchar) with a btree index + ON DELETE SET NULL
 * on the FK so deleting a Media row doesn't break Books.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "books"
      ADD COLUMN IF NOT EXISTS "meta_title" varchar,
      ADD COLUMN IF NOT EXISTS "meta_description" varchar,
      ADD COLUMN IF NOT EXISTS "meta_image_id" integer,
      ADD COLUMN IF NOT EXISTS "meta_keywords" varchar;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'books' AND constraint_name = 'books_meta_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "books"
          ADD CONSTRAINT "books_meta_image_id_media_id_fk"
          FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "books_meta_meta_image_idx"
      ON "books" USING btree ("meta_image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "books_meta_meta_image_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_meta_image_id_media_id_fk";
  `);
  await db.execute(sql`
    ALTER TABLE "books"
      DROP COLUMN IF EXISTS "meta_title",
      DROP COLUMN IF EXISTS "meta_description",
      DROP COLUMN IF EXISTS "meta_image_id",
      DROP COLUMN IF EXISTS "meta_keywords";
  `);
}
