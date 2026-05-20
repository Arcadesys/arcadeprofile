import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Replaces the per-audience `posts_newsletter_sends` array table with a
 * single embedded `acCampaign` group on `posts`.
 *
 * The old model created 2-3 AC campaigns per post (one per audience: All +
 * Fiction or All + Essays) and stored each result in a row of
 * posts_newsletter_sends. The new model creates ONE AC campaign per post that
 * targets the relevant lists directly (AC dedupes recipients across lists),
 * so one campaign id + a few sync-state fields are sufficient.
 *
 * Data: this migration drops the array table. Historical send records are
 * lost from Payload but remain visible in the AC dashboard. Posts that were
 * already 'sent' keep their publish_status — the new sync hook treats them
 * as steady-state and won't try to recreate a campaign for them on next save
 * (their acCampaign group is null and scheduledPublishDate is in the past,
 * so the validation hook + 'no-scheduled-date' guard cover them).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "posts_newsletter_sends" CASCADE;`);
  await db.execute(
    sql`DROP TYPE IF EXISTS "public"."enum_posts_newsletter_sends_audience";`,
  );

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
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
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
  await db.execute(
    sql`DROP TYPE IF EXISTS "public"."enum_posts_ac_campaign_status";`,
  );

  // Structural restore of the array table. Historical rows are gone — this
  // is documented as a no-op for the data.
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
