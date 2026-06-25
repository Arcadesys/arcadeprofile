import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Widen the per-post newsletter status enum to the delivery state machine
 * (split `sent` into `submitted` vs `delivered`, add `suppressed`/`undelivered`)
 * and add the attempt-id + undelivered-at columns.
 *
 * Postgres can't add an enum value and use it in the same transaction, so we
 * rename → recreate → cast (which also backfills) rather than `ADD VALUE`.
 *
 * Fix-forward backfill: legacy `sent` → `delivered` (terminal). This is
 * deliberate — we cannot prove delivery for legacy rows, but marking them
 * terminal stops the new retry loop from re-blasting the historical backlog.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_posts_newsletter_send_status"
        RENAME TO "enum_posts_newsletter_send_status__old";
    EXCEPTION
      WHEN undefined_object THEN null; -- already renamed / never existed
      WHEN duplicate_object THEN null; -- target name already taken by a prior partial run
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_newsletter_send_status" AS ENUM (
        'pending', 'suppressed', 'skipped', 'submitted', 'delivered', 'failed', 'undelivered'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Cast the column to the new enum, mapping legacy `sent` → `delivered`.
  await db.execute(sql`
    ALTER TABLE "posts"
      ALTER COLUMN "newsletter_send_status" TYPE "public"."enum_posts_newsletter_send_status"
      USING (
        CASE "newsletter_send_status"::text
          WHEN 'sent' THEN 'delivered'
          ELSE "newsletter_send_status"::text
        END::"public"."enum_posts_newsletter_send_status"
      );
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_posts_newsletter_send_status__old";`);

  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "newsletter_send_attempt_id" varchar,
      ADD COLUMN IF NOT EXISTS "newsletter_send_undelivered_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "newsletter_send_attempt_id",
      DROP COLUMN IF EXISTS "newsletter_send_undelivered_at";
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_posts_newsletter_send_status"
        RENAME TO "enum_posts_newsletter_send_status__new";
    EXCEPTION
      WHEN undefined_object THEN null;
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_newsletter_send_status" AS ENUM (
        'pending', 'sent', 'failed', 'skipped'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Collapse the new states back onto the original four. submitted/delivered/
  // undelivered → sent; suppressed → skipped. (Lossy but reversible enough.)
  await db.execute(sql`
    ALTER TABLE "posts"
      ALTER COLUMN "newsletter_send_status" TYPE "public"."enum_posts_newsletter_send_status"
      USING (
        CASE "newsletter_send_status"::text
          WHEN 'submitted' THEN 'sent'
          WHEN 'delivered' THEN 'sent'
          WHEN 'undelivered' THEN 'sent'
          WHEN 'suppressed' THEN 'skipped'
          ELSE "newsletter_send_status"::text
        END::"public"."enum_posts_newsletter_send_status"
      );
  `);

  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_posts_newsletter_send_status__new";`);
}
