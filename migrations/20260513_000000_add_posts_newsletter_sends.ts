import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_newsletter_sends_audience" AS ENUM ('all', 'fiction', 'essays');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "posts_newsletter_sends" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "audience" "public"."enum_posts_newsletter_sends_audience" NOT NULL,
      "sent_at" timestamp(3) with time zone,
      "message_id" varchar,
      "campaign_id" varchar
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "posts_newsletter_sends"
        ADD CONSTRAINT "posts_newsletter_sends_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "posts_newsletter_sends_order_idx"
      ON "posts_newsletter_sends" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_newsletter_sends_parent_id_idx"
      ON "posts_newsletter_sends" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "posts_newsletter_sends" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_posts_newsletter_sends_audience";`);
}
