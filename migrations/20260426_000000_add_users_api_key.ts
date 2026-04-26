import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
    ALTER TABLE "users" ADD COLUMN "api_key" varchar;
    ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
    CREATE UNIQUE INDEX IF NOT EXISTS "users_api_key_index_idx" ON "users" ("api_key_index");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "users_api_key_index_idx";
    ALTER TABLE "users" DROP COLUMN "api_key_index";
    ALTER TABLE "users" DROP COLUMN "api_key";
    ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  `);
}
