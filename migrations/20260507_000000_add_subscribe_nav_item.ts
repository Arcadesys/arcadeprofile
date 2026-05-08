import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "nav_items" ("label", "href", "order", "visible", "is_primary")
    SELECT 'Subscribe', '/subscribe', 12, true, false
    WHERE NOT EXISTS (
      SELECT 1 FROM "nav_items" WHERE "href" = '/subscribe'
    );
  `);

  await db.execute(sql`
    UPDATE "nav_items" SET "visible" = false WHERE "href" = '/resume';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "nav_items" WHERE "href" = '/subscribe';
  `);

  await db.execute(sql`
    UPDATE "nav_items" SET "visible" = true WHERE "href" = '/resume';
  `);
}
