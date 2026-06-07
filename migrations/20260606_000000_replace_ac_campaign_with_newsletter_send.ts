import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_newsletter_send_status" AS ENUM ('pending', 'sent', 'failed', 'skipped');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "newsletter_send_message_id" text,
      ADD COLUMN IF NOT EXISTS "newsletter_send_status" "public"."enum_posts_newsletter_send_status",
      ADD COLUMN IF NOT EXISTS "newsletter_send_targeted_lists" varchar,
      ADD COLUMN IF NOT EXISTS "newsletter_send_recipient_count" numeric,
      ADD COLUMN IF NOT EXISTS "newsletter_send_sent_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "newsletter_send_last_synced_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "newsletter_send_last_error" text;
  `);

  await db.execute(sql`
    UPDATE "posts"
    SET
      "newsletter_send_message_id" = COALESCE("ac_campaign_message_id", "ac_campaign_campaign_id"),
      "newsletter_send_status" = CASE
        WHEN "ac_campaign_status" = 'sent' THEN 'sent'::"public"."enum_posts_newsletter_send_status"
        WHEN "ac_campaign_status" = 'failed' THEN 'failed'::"public"."enum_posts_newsletter_send_status"
        WHEN "ac_campaign_status" IN ('pending', 'scheduled') THEN 'pending'::"public"."enum_posts_newsletter_send_status"
        ELSE "newsletter_send_status"
      END,
      "newsletter_send_targeted_lists" = COALESCE("newsletter_send_targeted_lists", "ac_campaign_targeted_lists"),
      "newsletter_send_sent_at" = CASE
        WHEN "ac_campaign_status" = 'sent' THEN COALESCE("newsletter_send_sent_at", "ac_campaign_last_synced_at")
        ELSE "newsletter_send_sent_at"
      END,
      "newsletter_send_last_synced_at" = COALESCE("newsletter_send_last_synced_at", "ac_campaign_last_synced_at"),
      "newsletter_send_last_error" = COALESCE("newsletter_send_last_error", "ac_campaign_last_error")
    WHERE
      "ac_campaign_message_id" IS NOT NULL
      OR "ac_campaign_campaign_id" IS NOT NULL
      OR "ac_campaign_status" IS NOT NULL
      OR "ac_campaign_targeted_lists" IS NOT NULL
      OR "ac_campaign_last_synced_at" IS NOT NULL
      OR "ac_campaign_last_error" IS NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "ac_campaign_campaign_id",
      DROP COLUMN IF EXISTS "ac_campaign_message_id",
      DROP COLUMN IF EXISTS "ac_campaign_scheduled_for",
      DROP COLUMN IF EXISTS "ac_campaign_status",
      DROP COLUMN IF EXISTS "ac_campaign_targeted_lists",
      DROP COLUMN IF EXISTS "ac_campaign_last_synced_at",
      DROP COLUMN IF EXISTS "ac_campaign_last_error";
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_posts_ac_campaign_status";`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_ac_campaign_status" AS ENUM ('pending', 'scheduled', 'sent', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "ac_campaign_campaign_id" varchar,
      ADD COLUMN IF NOT EXISTS "ac_campaign_message_id" varchar,
      ADD COLUMN IF NOT EXISTS "ac_campaign_scheduled_for" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "ac_campaign_status" "public"."enum_posts_ac_campaign_status",
      ADD COLUMN IF NOT EXISTS "ac_campaign_targeted_lists" varchar,
      ADD COLUMN IF NOT EXISTS "ac_campaign_last_synced_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "ac_campaign_last_error" text;
  `);

  await db.execute(sql`
    UPDATE "posts"
    SET
      "ac_campaign_message_id" = "newsletter_send_message_id",
      "ac_campaign_status" = CASE
        WHEN "newsletter_send_status" = 'sent' THEN 'sent'::"public"."enum_posts_ac_campaign_status"
        WHEN "newsletter_send_status" = 'failed' THEN 'failed'::"public"."enum_posts_ac_campaign_status"
        WHEN "newsletter_send_status" = 'pending' THEN 'pending'::"public"."enum_posts_ac_campaign_status"
        ELSE "ac_campaign_status"
      END,
      "ac_campaign_targeted_lists" = "newsletter_send_targeted_lists",
      "ac_campaign_last_synced_at" = "newsletter_send_last_synced_at",
      "ac_campaign_last_error" = "newsletter_send_last_error"
    WHERE
      "newsletter_send_message_id" IS NOT NULL
      OR "newsletter_send_status" IS NOT NULL
      OR "newsletter_send_targeted_lists" IS NOT NULL
      OR "newsletter_send_last_synced_at" IS NOT NULL
      OR "newsletter_send_last_error" IS NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "newsletter_send_message_id",
      DROP COLUMN IF EXISTS "newsletter_send_status",
      DROP COLUMN IF EXISTS "newsletter_send_targeted_lists",
      DROP COLUMN IF EXISTS "newsletter_send_recipient_count",
      DROP COLUMN IF EXISTS "newsletter_send_sent_at",
      DROP COLUMN IF EXISTS "newsletter_send_last_synced_at",
      DROP COLUMN IF EXISTS "newsletter_send_last_error";
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_posts_newsletter_send_status";`);
}
