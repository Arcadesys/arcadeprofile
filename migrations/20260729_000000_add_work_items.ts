import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_work_items_type"
        AS ENUM ('epic', 'story', 'task');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_work_items_owner"
        AS ENUM ('human', 'ai');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_work_items_status"
        AS ENUM ('inbox', 'ready', 'running', 'review', 'done');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "work_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "type" "public"."enum_work_items_type" NOT NULL,
      "parent_id" integer,
      "definition_of_done" text,
      "owner" "public"."enum_work_items_owner" DEFAULT 'human' NOT NULL,
      "budget_usd" numeric DEFAULT 0,
      "status" "public"."enum_work_items_status" DEFAULT 'inbox' NOT NULL,
      "position" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "work_items"
        ADD CONSTRAINT "work_items_parent_id_work_items_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."work_items"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "work_items_title_idx"
      ON "work_items" USING btree ("title");
    CREATE INDEX IF NOT EXISTS "work_items_type_idx"
      ON "work_items" USING btree ("type");
    CREATE INDEX IF NOT EXISTS "work_items_parent_idx"
      ON "work_items" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "work_items_status_idx"
      ON "work_items" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "work_items_updated_at_idx"
      ON "work_items" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "work_items_created_at_idx"
      ON "work_items" USING btree ("created_at");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "work_items_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_work_items_fk"
        FOREIGN KEY ("work_items_id") REFERENCES "public"."work_items"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_work_items_id_idx"
      ON "payload_locked_documents_rels" USING btree ("work_items_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_work_items_id_idx";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_work_items_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "work_items_id";
    DROP TABLE IF EXISTS "work_items" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_work_items_status";
    DROP TYPE IF EXISTS "public"."enum_work_items_owner";
    DROP TYPE IF EXISTS "public"."enum_work_items_type";
  `);
}
