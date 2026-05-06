import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_subscribers_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_subscribers_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "subscribers_id";

    DROP TABLE IF EXISTS "subscribers_tags" CASCADE;
    DROP TABLE IF EXISTS "subscribers" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_subscribers_tags_tag";
  `);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Subscriber data lived in ActiveCampaign as the source of truth after
  // this migration; rebuilding the table here would not repopulate it.
  // Intentionally a no-op.
}
