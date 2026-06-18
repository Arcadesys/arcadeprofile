import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_postmark_events_event_type" AS ENUM (
        'submitted',
        'delivery',
        'bounce',
        'open',
        'click',
        'spam_complaint',
        'subscription_change',
        'smtp_api_error',
        'other'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "postmark_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "post_id" integer,
      "message_id" varchar NOT NULL,
      "event_type" "public"."enum_postmark_events_event_type" NOT NULL,
      "recipient_email" varchar,
      "tag" varchar,
      "message_stream" varchar,
      "occurred_at" timestamp(3) with time zone,
      "details" text,
      "metadata" jsonb,
      "raw" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "postmark_events"
        ADD CONSTRAINT "postmark_events_post_id_posts_id_fk"
        FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "postmark_events_post_id_idx"
      ON "postmark_events" USING btree ("post_id");
    CREATE INDEX IF NOT EXISTS "postmark_events_message_id_idx"
      ON "postmark_events" USING btree ("message_id");
    CREATE INDEX IF NOT EXISTS "postmark_events_event_type_idx"
      ON "postmark_events" USING btree ("event_type");
    CREATE INDEX IF NOT EXISTS "postmark_events_recipient_email_idx"
      ON "postmark_events" USING btree ("recipient_email");
    CREATE INDEX IF NOT EXISTS "postmark_events_occurred_at_idx"
      ON "postmark_events" USING btree ("occurred_at");
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "postmark_events_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_postmark_events_fk"
        FOREIGN KEY ("postmark_events_id") REFERENCES "public"."postmark_events"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_postmark_events_id_idx"
      ON "payload_locked_documents_rels" USING btree ("postmark_events_id");
  `);

  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "newsletter_send_accepted_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_failed_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_delivered_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_bounced_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_opened_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_clicked_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_complained_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_last_event_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "newsletter_send_accepted_count",
      DROP COLUMN IF EXISTS "newsletter_send_failed_count",
      DROP COLUMN IF EXISTS "newsletter_send_delivered_count",
      DROP COLUMN IF EXISTS "newsletter_send_bounced_count",
      DROP COLUMN IF EXISTS "newsletter_send_opened_count",
      DROP COLUMN IF EXISTS "newsletter_send_clicked_count",
      DROP COLUMN IF EXISTS "newsletter_send_complained_count",
      DROP COLUMN IF EXISTS "newsletter_send_last_event_at";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_postmark_events_id_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_postmark_events_fk";
  `);

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "postmark_events_id";
  `);

  await db.execute(sql`DROP TABLE IF EXISTS "postmark_events" CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_postmark_events_event_type";`);
}
