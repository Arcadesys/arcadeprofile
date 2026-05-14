import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Adds `preview_token` to posts: an 8-char base62-ish token used to share
 * scheduled/draft posts via /preview/[token] before they're public.
 *
 * The application-level generator (lib/preview-token.ts) emits true base62
 * (A-Za-z0-9) via crypto.randomBytes; this migration's backfill emits the
 * hex subset (0-9a-f), which is still a valid match for the field's
 * `[A-Za-z0-9]{8}` validator. Newly-created posts go through the JS
 * generator via the ensurePreviewTokenHook beforeChange hook.
 *
 * Backfill loops one row at a time and retries on the unique constraint —
 * collisions at 8 hex chars (4.3B combos) are vanishingly rare for any
 * realistic post count, but the retry keeps it bulletproof.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // gen_random_bytes() lives in pgcrypto. Managed providers (Neon, Supabase,
  // RDS) all ship it; IF NOT EXISTS keeps this a no-op when already enabled.
  // Without this, the backfill DO block below fails with
  //   function gen_random_bytes(integer) does not exist
  // and the whole deploy aborts before next build runs.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "preview_token" varchar;
  `);

  await db.execute(sql`
    DO $$
    DECLARE
      r RECORD;
      attempts INTEGER;
      candidate TEXT;
    BEGIN
      FOR r IN SELECT id FROM "posts" WHERE "preview_token" IS NULL LOOP
        attempts := 0;
        LOOP
          attempts := attempts + 1;
          candidate := substr(encode(gen_random_bytes(8), 'hex'), 1, 8);
          BEGIN
            UPDATE "posts" SET "preview_token" = candidate WHERE id = r.id;
            EXIT;
          EXCEPTION WHEN unique_violation THEN
            IF attempts > 10 THEN RAISE; END IF;
          END;
        END LOOP;
      END LOOP;
    END $$;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "posts_preview_token_idx"
      ON "posts" ("preview_token");
  `);

  await db.execute(sql`
    ALTER TABLE "posts" ALTER COLUMN "preview_token" SET NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "posts_preview_token_idx";
  `);
  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "preview_token";
  `);
}
