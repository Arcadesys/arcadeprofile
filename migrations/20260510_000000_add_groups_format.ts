import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_groups_format" AS ENUM ('serial', 'collection');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await db.execute(sql`
    ALTER TABLE "groups"
    ADD COLUMN IF NOT EXISTS "format" "public"."enum_groups_format" DEFAULT 'serial';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "groups" DROP COLUMN IF EXISTS "format";`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_groups_format";`);
}
