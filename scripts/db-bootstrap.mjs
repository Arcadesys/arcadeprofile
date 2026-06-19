#!/usr/bin/env node
// Idempotent SQL bootstrap. Runs during the Vercel build to guarantee
// schema for fields whose Payload migrations were never tracked properly
// (e.g. dev-mode pushes that recorded snapshots without applying the .ts
// files, leaving `payload migrate` thinking everything is already done).
//
// Every statement is guarded with `IF EXISTS`/`IF NOT EXISTS` (or a duplicate
// constraint guard) so re-runs are safe.

import nextEnv from '@next/env';
import postgres from 'postgres';

// Vercel injects DATABASE_URL via project env vars, so this is a no-op in CI.
// Local invocations resolve .env.* with the same precedence Next.js uses.
// @next/env is CJS — use default-import + destructure for ESM interop.
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;
if (!connectionString) {
  console.log('[db-bootstrap] DATABASE_URL not set — skipping.');
  process.exit(0);
}

const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString);
const sql = postgres(connectionString, {
  ssl: isLocal ? false : 'require',
  max: 1,
});

async function bootstrapTargetSchemaExists() {
  const [row] = await sql`
    SELECT
      to_regclass('public.posts') AS "posts",
      to_regclass('public.groups') AS "groups",
      to_regclass('public.payload_locked_documents_rels') AS "payloadLockedDocumentsRels"
  `;

  return Boolean(row?.posts && row.groups && row.payloadLockedDocumentsRels);
}

async function migrationHasRun(name) {
  const [{ exists }] = await sql`
    SELECT to_regclass('public.payload_migrations') IS NOT NULL AS "exists"
  `;
  if (!exists) return false;

  const rows = await sql`
    SELECT 1 FROM "payload_migrations"
      WHERE "name" = ${name}
      LIMIT 1
  `;
  return rows.length > 0;
}

if (!(await bootstrapTargetSchemaExists())) {
  console.log('[db-bootstrap] base Payload schema not found — skipping until migrations create it.');
  await sql.end({ timeout: 5 });
  process.exit(0);
}

const statements = [
  {
    label: 'legacy posts.newsletter_sent for pending suppress migration',
    run: async () => {
      if (await migrationHasRun('20260513_010000_replace_newsletter_sent_with_suppress')) {
        return;
      }

      await sql`
        ALTER TABLE "posts"
          ADD COLUMN IF NOT EXISTS "newsletter_sent" boolean DEFAULT false
      `;
    },
  },
  {
    label: 'nav_items table',
    run: () => sql`
      CREATE TABLE IF NOT EXISTS "nav_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "label" varchar NOT NULL,
        "href" varchar NOT NULL,
        "order" numeric NOT NULL DEFAULT 10,
        "visible" boolean DEFAULT true,
        "is_primary" boolean DEFAULT false,
        "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
        "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
      )
    `,
  },
  {
    label: 'posts.chapter',
    run: () => sql`
      ALTER TABLE "posts"
        ADD COLUMN IF NOT EXISTS "chapter" varchar
    `,
  },
  {
    label: 'groups_chapters table',
    run: () => sql`
      CREATE TABLE IF NOT EXISTS "groups_chapters" (
        "id" serial PRIMARY KEY NOT NULL,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "title" varchar NOT NULL,
        "slug" varchar NOT NULL
      )
    `,
  },
  {
    label: 'groups_chapters FK',
    run: () => sql`
      DO $$ BEGIN
        ALTER TABLE "groups_chapters"
          ADD CONSTRAINT "groups_chapters_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."groups"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    label: 'groups_chapters_order_idx',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "groups_chapters_order_idx"
        ON "groups_chapters" USING btree ("_order")
    `,
  },
  {
    label: 'groups_chapters_parent_id_idx',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "groups_chapters_parent_id_idx"
        ON "groups_chapters" USING btree ("_parent_id")
    `,
  },
  {
    label: 'payload_locked_documents_rels.nav_items_id',
    run: () => sql`
      ALTER TABLE "payload_locked_documents_rels"
        ADD COLUMN IF NOT EXISTS "nav_items_id" integer
    `,
  },
  {
    label: 'payload_locked_documents_rels.nav_items_id FK',
    run: () => sql`
      DO $$ BEGIN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_nav_items_fk"
          FOREIGN KEY ("nav_items_id") REFERENCES "public"."nav_items"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    label: 'payload_locked_documents_rels_nav_items_id_idx',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_nav_items_id_idx"
        ON "payload_locked_documents_rels" USING btree ("nav_items_id")
    `,
  },
  {
    label: 'enum_groups_format',
    run: () => sql`
      DO $$ BEGIN
        CREATE TYPE "enum_groups_format" AS ENUM ('serial', 'collection');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `,
  },
  {
    label: 'groups.format',
    run: () => sql`
      ALTER TABLE "groups"
        ADD COLUMN IF NOT EXISTS "format" "enum_groups_format" DEFAULT 'serial'
    `,
  },
  {
    label: 'posts.suppress_newsletter',
    run: () => sql`
      ALTER TABLE "posts"
        ADD COLUMN IF NOT EXISTS "suppress_newsletter" boolean DEFAULT false NOT NULL
    `,
  },
  {
    label: 'legacy posts.ac_campaign_* for pending newsletterSend migration',
    run: async () => {
      if (await migrationHasRun('20260606_000000_replace_ac_campaign_with_newsletter_send')) {
        return;
      }

      await sql`
        DO $$ BEGIN
          CREATE TYPE "public"."enum_posts_ac_campaign_status" AS ENUM ('pending', 'scheduled', 'sent', 'failed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `;

      await sql`
        ALTER TABLE "posts"
          ADD COLUMN IF NOT EXISTS "ac_campaign_campaign_id" varchar,
          ADD COLUMN IF NOT EXISTS "ac_campaign_message_id" varchar,
          ADD COLUMN IF NOT EXISTS "ac_campaign_scheduled_for" timestamp(3) with time zone,
          ADD COLUMN IF NOT EXISTS "ac_campaign_status" "public"."enum_posts_ac_campaign_status",
          ADD COLUMN IF NOT EXISTS "ac_campaign_targeted_lists" varchar,
          ADD COLUMN IF NOT EXISTS "ac_campaign_last_synced_at" timestamp(3) with time zone,
          ADD COLUMN IF NOT EXISTS "ac_campaign_last_error" text
      `;
    },
  },
  {
    label: 'enum_posts_newsletter_send_status',
    run: () => sql`
      DO $$ BEGIN
        CREATE TYPE "public"."enum_posts_newsletter_send_status" AS ENUM ('pending', 'sent', 'failed', 'skipped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `,
  },
  {
    label: 'posts.newsletter_send_*',
    run: () => sql`
      ALTER TABLE "posts"
        ADD COLUMN IF NOT EXISTS "newsletter_send_message_id" text,
        ADD COLUMN IF NOT EXISTS "newsletter_send_status" "public"."enum_posts_newsletter_send_status",
        ADD COLUMN IF NOT EXISTS "newsletter_send_targeted_lists" varchar,
        ADD COLUMN IF NOT EXISTS "newsletter_send_recipient_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_accepted_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_failed_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_delivered_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_bounced_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_opened_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_clicked_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_complained_count" numeric,
        ADD COLUMN IF NOT EXISTS "newsletter_send_sent_at" timestamp(3) with time zone,
        ADD COLUMN IF NOT EXISTS "newsletter_send_last_synced_at" timestamp(3) with time zone,
        ADD COLUMN IF NOT EXISTS "newsletter_send_last_event_at" timestamp(3) with time zone,
        ADD COLUMN IF NOT EXISTS "newsletter_send_last_error" text
    `,
  },
  {
    label: 'post_reactions table',
    run: () => sql`
      CREATE TABLE IF NOT EXISTS "post_reactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "post_id" integer NOT NULL,
        "emoji" varchar NOT NULL,
        "client_id" varchar NOT NULL,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      )
    `,
  },
  {
    label: 'post_reactions FK',
    run: () => sql`
      DO $$ BEGIN
        ALTER TABLE "post_reactions"
          ADD CONSTRAINT "post_reactions_post_id_fk"
          FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
          ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    label: 'post_reactions indexes',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "post_reactions_post_id_idx"
        ON "post_reactions" USING btree ("post_id");
      CREATE INDEX IF NOT EXISTS "post_reactions_client_id_idx"
        ON "post_reactions" USING btree ("client_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "post_reactions_post_emoji_client_unique_idx"
        ON "post_reactions" ("post_id", "emoji", "client_id")
    `,
  },
  {
    label: 'payload_locked_documents_rels.post_reactions_id',
    run: () => sql`
      ALTER TABLE "payload_locked_documents_rels"
        ADD COLUMN IF NOT EXISTS "post_reactions_id" integer
    `,
  },
  {
    label: 'payload_locked_documents_rels.post_reactions_id FK',
    run: () => sql`
      DO $$ BEGIN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_post_reactions_fk"
          FOREIGN KEY ("post_reactions_id") REFERENCES "public"."post_reactions"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    label: 'payload_locked_documents_rels_post_reactions_id_idx',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_post_reactions_id_idx"
        ON "payload_locked_documents_rels" USING btree ("post_reactions_id")
    `,
  },
  {
    label: 'enum_postmark_events_event_type',
    run: () => sql`
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
      END $$
    `,
  },
  {
    label: 'postmark_events table',
    run: () => sql`
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
      )
    `,
  },
  {
    label: 'postmark_events FK',
    run: () => sql`
      DO $$ BEGIN
        ALTER TABLE "postmark_events"
          ADD CONSTRAINT "postmark_events_post_id_posts_id_fk"
          FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    label: 'postmark_events indexes',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "postmark_events_post_id_idx"
        ON "postmark_events" USING btree ("post_id");
      CREATE INDEX IF NOT EXISTS "postmark_events_message_id_idx"
        ON "postmark_events" USING btree ("message_id");
      CREATE INDEX IF NOT EXISTS "postmark_events_event_type_idx"
        ON "postmark_events" USING btree ("event_type");
      CREATE INDEX IF NOT EXISTS "postmark_events_recipient_email_idx"
        ON "postmark_events" USING btree ("recipient_email");
      CREATE INDEX IF NOT EXISTS "postmark_events_occurred_at_idx"
        ON "postmark_events" USING btree ("occurred_at")
    `,
  },
  {
    label: 'payload_locked_documents_rels.postmark_events_id',
    run: () => sql`
      ALTER TABLE "payload_locked_documents_rels"
        ADD COLUMN IF NOT EXISTS "postmark_events_id" integer
    `,
  },
  {
    label: 'payload_locked_documents_rels.postmark_events_id FK',
    run: () => sql`
      DO $$ BEGIN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_postmark_events_fk"
          FOREIGN KEY ("postmark_events_id") REFERENCES "public"."postmark_events"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    label: 'payload_locked_documents_rels_postmark_events_id_idx',
    run: () => sql`
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_postmark_events_id_idx"
        ON "payload_locked_documents_rels" USING btree ("postmark_events_id")
    `,
  },
  {
    label: 'groups.jacket_description',
    run: () => sql`
      ALTER TABLE "groups"
        ADD COLUMN IF NOT EXISTS "jacket_description" jsonb
    `,
  },
  {
    label: 'books.buy_label',
    run: () => sql`
      ALTER TABLE IF EXISTS "books"
        ADD COLUMN IF NOT EXISTS "buy_label" varchar
    `,
  },
  {
    label: 'drop legacy posts sample fields',
    run: () => sql`
      ALTER TABLE IF EXISTS "_posts_v"
        DROP COLUMN IF EXISTS "version_sample_label",
        DROP COLUMN IF EXISTS "version_sample_order",
        DROP COLUMN IF EXISTS "version_show_in_samples";

      ALTER TABLE IF EXISTS "posts"
        DROP COLUMN IF EXISTS "sample_label",
        DROP COLUMN IF EXISTS "sample_order",
        DROP COLUMN IF EXISTS "show_in_samples"
    `,
  },
  {
    label: 'drop legacy demos table',
    run: () => sql`
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_demos_fk";

      DROP INDEX IF EXISTS "payload_locked_documents_rels_demos_id_idx";

      ALTER TABLE "payload_locked_documents_rels"
        DROP COLUMN IF EXISTS "demos_id";

      DROP TABLE IF EXISTS "demos" CASCADE
    `,
  },
  {
    label: 'drop legacy projects table',
    run: () => sql`
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_projects_fk";

      DROP INDEX IF EXISTS "payload_locked_documents_rels_projects_id_idx";

      ALTER TABLE "payload_locked_documents_rels"
        DROP COLUMN IF EXISTS "projects_id";

      DROP TABLE IF EXISTS "projects" CASCADE
    `,
  },
];

let failed = false;
for (const { label, run } of statements) {
  try {
    await run();
    console.log(`[db-bootstrap] ok: ${label}`);
  } catch (err) {
    failed = true;
    console.error(`[db-bootstrap] FAIL: ${label}`);
    console.error(err);
  }
}

await sql.end({ timeout: 5 });
process.exit(failed ? 1 : 0);
