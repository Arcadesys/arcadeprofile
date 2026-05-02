import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

// The recent group-related array tables (groups_resources, groups_related_post_slugs,
// groups_chapters) were created with `id serial PRIMARY KEY`, but Payload's
// non-versioned array tables use varchar ids that store a client-supplied UUID.
// Inserts against the integer id column failed with a type-cast error.
// All three tables are empty in production, so we can safely drop and recreate
// the id column as varchar.
const tables = ['groups_resources', 'groups_related_post_slugs', 'groups_chapters'] as const;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const table of tables) {
    await db.execute(sql.raw(`
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "id";
      DROP SEQUENCE IF EXISTS "${table}_id_seq";
      ALTER TABLE "${table}" ADD COLUMN "id" varchar PRIMARY KEY NOT NULL;
    `));
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of tables) {
    await db.execute(sql.raw(`
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "id";
      ALTER TABLE "${table}" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;
    `));
  }
}
