import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Replaces the `newsletter_sent` boolean with `suppress_newsletter`.
 *
 * The old column conflated two things: "all audiences delivered" (a derived
 * rollup of newsletterSends coverage) AND "intentionally skip the fan-out"
 * (the MCP skipNewsletter use case). Once it flipped to true, the afterChange
 * gate `!doc.newsletterSent` blocked further sends forever — including for
 * posts where it was set without any actual sends (e.g. via the MCP
 * skipNewsletter arg, an admin checkbox toggle, or an older hook code path).
 *
 * The new architecture:
 *   - `publish_status === 'sent'` is the only "all delivered" signal,
 *     written by the hook after every targeted audience has a record in
 *     newsletterSends.
 *   - `suppress_newsletter` is the standalone "skip fan-out" intent flag,
 *     independent of delivery state.
 *
 * Backfill strategy: posts with `newsletter_sent = true AND publish_status !=
 * 'sent'` were marked "done" without actually completing the per-audience
 * fan-out (e.g. The Slow Blade). We carry that intent forward as
 * `suppress_newsletter = true` rather than auto-resending — operators can
 * uncheck the flag on individual posts they want to retry. Posts already in
 * `publish_status = 'sent'` need no flag; their delivery state lives in
 * publish_status now.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "suppress_newsletter" boolean DEFAULT false NOT NULL;
  `);

  await db.execute(sql`
    UPDATE "posts"
      SET "suppress_newsletter" = true
      WHERE "newsletter_sent" = true
        AND ("publish_status" IS NULL OR "publish_status" != 'sent');
  `);

  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "newsletter_sent";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "newsletter_sent" boolean DEFAULT false;
  `);

  // Lossy reverse: in the new world "all delivered" lives in publish_status
  // and "suppressed" lives in suppress_newsletter. Reconstruct the old single
  // flag as the union of both signals — same coarse semantics the old gate
  // used (true = afterChange hook short-circuits).
  await db.execute(sql`
    UPDATE "posts"
      SET "newsletter_sent" = ("suppress_newsletter" = true OR "publish_status" = 'sent');
  `);

  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "suppress_newsletter";
  `);
}
