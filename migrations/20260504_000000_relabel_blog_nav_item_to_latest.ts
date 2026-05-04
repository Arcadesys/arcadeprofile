import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // The /blog → /latest rename in PR #71 left the Payload-managed nav row as a
  // manual admin step. Update any surviving Blog row so the live navbar matches
  // the static fallback in app/components/Navbar.tsx.
  await db.execute(sql`
    UPDATE "nav_items"
    SET "href" = '/latest',
        "label" = 'Latest',
        "updated_at" = now()
    WHERE "href" = '/blog' OR "label" = 'Blog';
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: we don't want to revive the dead /blog href on rollback.
}
