import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "social_credentials" (
      "id" serial PRIMARY KEY NOT NULL,
      "bluesky_handle" varchar,
      "bluesky_app_password" varchar,
      "facebook_page_id" varchar,
      "facebook_page_token" varchar,
      "facebook_graph_version" varchar DEFAULT 'v21.0',
      "instagram_business_account_id" varchar,
      "linkedin_access_token" varchar,
      "linkedin_author_urn" varchar,
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "social_credentials" CASCADE;
  `);
}
