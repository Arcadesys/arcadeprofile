import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_demos_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_demos_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "demos_id";

    DROP TABLE IF EXISTS "demos" CASCADE;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "demos" (
      "id" serial PRIMARY KEY NOT NULL,
      "slug" varchar NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar NOT NULL,
      "image" varchar,
      "embed_url" varchar NOT NULL,
      "tags" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "demos_slug_idx" ON "demos" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "demos_updated_at_idx" ON "demos" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "demos_created_at_idx" ON "demos" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "demos_id" integer;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_demos_id_idx"
      ON "payload_locked_documents_rels" USING btree ("demos_id");

    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_demos_fk";

    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_demos_fk"
      FOREIGN KEY ("demos_id") REFERENCES "public"."demos"("id")
      ON DELETE cascade ON UPDATE no action;
  `);
}
