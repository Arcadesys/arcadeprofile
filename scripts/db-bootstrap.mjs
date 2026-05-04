#!/usr/bin/env node
// Idempotent SQL bootstrap. Runs during the Vercel build to guarantee
// schema for fields whose Payload migrations were never tracked properly
// (e.g. dev-mode pushes that recorded snapshots without applying the .ts
// files, leaving `payload migrate` thinking everything is already done).
//
// Every statement is `IF NOT EXISTS` so re-runs are safe.

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log('[db-bootstrap] DATABASE_URL not set — skipping.');
  process.exit(0);
}

const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString);
const sql = postgres(connectionString, {
  ssl: isLocal ? false : 'require',
  max: 1,
});

const statements = [
  {
    label: 'posts.newsletter_sent',
    run: () => sql`
      ALTER TABLE "posts"
        ADD COLUMN IF NOT EXISTS "newsletter_sent" boolean DEFAULT false
    `,
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
    label: 'groups.jacket_description',
    run: () => sql`
      ALTER TABLE "groups"
        ADD COLUMN IF NOT EXISTS "jacket_description" jsonb
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
