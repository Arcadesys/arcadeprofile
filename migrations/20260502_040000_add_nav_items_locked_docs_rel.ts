import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // The NavItems collection (added 2026-04-29) was never wired into
  // payload_locked_documents_rels. Drizzle's schema for that table is
  // generated from the registered collections list, so SELECTs against it
  // expect a nav_items_id column — and Payload performs that SELECT every
  // time the admin loads a doc edit view. Result: blank screen with
  // "column nav_items_id does not exist" in the runtime logs.
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "nav_items_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_nav_items_fk"
        FOREIGN KEY ("nav_items_id") REFERENCES "public"."nav_items"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_nav_items_id_idx"
      ON "payload_locked_documents_rels" USING btree ("nav_items_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_nav_items_id_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_nav_items_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "nav_items_id";
  `);
}
