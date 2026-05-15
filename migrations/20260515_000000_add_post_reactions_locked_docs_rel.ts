import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Wires the new `post-reactions` collection into payload_locked_documents_rels.
 *
 * Drizzle generates the schema for that join table from the registered
 * collections list, so SELECTs against it expect a column per collection
 * (posts_id, groups_id, pages_id, …). Adding a collection without also
 * adding its `*_id` column crashes /admin on first render with
 * "column payload_locked_documents_rels.post_reactions_id does not exist".
 *
 * Same fix shape as 20260502_040000_add_nav_items_locked_docs_rel.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "post_reactions_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_post_reactions_fk"
        FOREIGN KEY ("post_reactions_id") REFERENCES "public"."post_reactions"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_post_reactions_id_idx"
      ON "payload_locked_documents_rels" USING btree ("post_reactions_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_post_reactions_id_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_post_reactions_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "post_reactions_id";
  `);
}
