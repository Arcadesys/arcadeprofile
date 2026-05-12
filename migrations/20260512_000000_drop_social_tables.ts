import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_social_posts_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_social_posts_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "social_posts_id";

    DROP TABLE IF EXISTS "social_posts" CASCADE;
    DROP TABLE IF EXISTS "social_credentials" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_social_posts_platform";
    DROP TYPE IF EXISTS "public"."enum_social_posts_variant";
    DROP TYPE IF EXISTS "public"."enum_social_posts_status";
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Social posting moved out of the app (Later via MCP); the credentials and
  // post-history tables aren't worth recreating here. Intentionally a no-op.
}
