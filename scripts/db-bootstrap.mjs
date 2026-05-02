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
    label: '_posts_v.version_newsletter_sent',
    run: () => sql`
      ALTER TABLE "_posts_v"
        ADD COLUMN IF NOT EXISTS "version_newsletter_sent" boolean DEFAULT false
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
