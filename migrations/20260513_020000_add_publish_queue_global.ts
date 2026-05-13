import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Singleton global row
    CREATE TABLE IF NOT EXISTS "publish_queue" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- fictionQueue array
    CREATE TABLE IF NOT EXISTS "publish_queue_fiction_queue" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "post_id" integer
    );

    ALTER TABLE "publish_queue_fiction_queue"
      DROP CONSTRAINT IF EXISTS "publish_queue_fiction_queue_parent_id_fk";
    ALTER TABLE "publish_queue_fiction_queue"
      ADD CONSTRAINT "publish_queue_fiction_queue_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."publish_queue"("id")
      ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "publish_queue_fiction_queue"
      DROP CONSTRAINT IF EXISTS "publish_queue_fiction_queue_post_id_fk";
    ALTER TABLE "publish_queue_fiction_queue"
      ADD CONSTRAINT "publish_queue_fiction_queue_post_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
      ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "publish_queue_fiction_queue_order_idx"
      ON "publish_queue_fiction_queue" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "publish_queue_fiction_queue_parent_id_idx"
      ON "publish_queue_fiction_queue" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "publish_queue_fiction_queue_post_id_idx"
      ON "publish_queue_fiction_queue" USING btree ("post_id");

    -- essaysQueue array
    CREATE TABLE IF NOT EXISTS "publish_queue_essays_queue" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "post_id" integer
    );

    ALTER TABLE "publish_queue_essays_queue"
      DROP CONSTRAINT IF EXISTS "publish_queue_essays_queue_parent_id_fk";
    ALTER TABLE "publish_queue_essays_queue"
      ADD CONSTRAINT "publish_queue_essays_queue_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."publish_queue"("id")
      ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "publish_queue_essays_queue"
      DROP CONSTRAINT IF EXISTS "publish_queue_essays_queue_post_id_fk";
    ALTER TABLE "publish_queue_essays_queue"
      ADD CONSTRAINT "publish_queue_essays_queue_post_id_fk"
      FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
      ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "publish_queue_essays_queue_order_idx"
      ON "publish_queue_essays_queue" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "publish_queue_essays_queue_parent_id_idx"
      ON "publish_queue_essays_queue" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "publish_queue_essays_queue_post_id_idx"
      ON "publish_queue_essays_queue" USING btree ("post_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "publish_queue_essays_queue" CASCADE;
    DROP TABLE IF EXISTS "publish_queue_fiction_queue" CASCADE;
    DROP TABLE IF EXISTS "publish_queue" CASCADE;
  `);
}
