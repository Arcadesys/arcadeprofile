import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Enums for select fields
    DO $$ BEGIN
      CREATE TYPE "public"."enum_groups_category" AS ENUM(
        'fiction', 'tools', 'experiments', 'audio-video', 'community', 'writing'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_groups_status" AS ENUM(
        'active', 'available', 'in-progress', 'archived'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_groups_project_c_t_a_type" AS ENUM(
        'preview', 'buy', 'experiment', 'youtube', 'audio', 'repo', 'download', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_groups_resources_kind" AS ENUM(
        'post', 'preview', 'buy', 'youtube', 'audio', 'experiment', 'repo', 'download', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- New scalar columns on groups
    ALTER TABLE "groups"
      ADD COLUMN IF NOT EXISTS "image" varchar,
      ADD COLUMN IF NOT EXISTS "href" varchar,
      ADD COLUMN IF NOT EXISTS "external" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "category" "public"."enum_groups_category",
      ADD COLUMN IF NOT EXISTS "status" "public"."enum_groups_status" DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "project_c_t_a_label" varchar,
      ADD COLUMN IF NOT EXISTS "project_c_t_a_href" varchar,
      ADD COLUMN IF NOT EXISTS "project_c_t_a_type" "public"."enum_groups_project_c_t_a_type";

    -- groups_resources array table
    CREATE TABLE IF NOT EXISTS "groups_resources" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "label" varchar NOT NULL,
      "href" varchar NOT NULL,
      "kind" "public"."enum_groups_resources_kind" NOT NULL,
      "description" varchar,
      "external" boolean DEFAULT false
    );

    ALTER TABLE "groups_resources"
      DROP CONSTRAINT IF EXISTS "groups_resources_parent_id_fk";
    ALTER TABLE "groups_resources"
      ADD CONSTRAINT "groups_resources_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."groups"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "groups_resources_order_idx"
      ON "groups_resources" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "groups_resources_parent_id_idx"
      ON "groups_resources" USING btree ("_parent_id");

    -- groups_related_post_slugs array table
    CREATE TABLE IF NOT EXISTS "groups_related_post_slugs" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "slug" varchar NOT NULL
    );

    ALTER TABLE "groups_related_post_slugs"
      DROP CONSTRAINT IF EXISTS "groups_related_post_slugs_parent_id_fk";
    ALTER TABLE "groups_related_post_slugs"
      ADD CONSTRAINT "groups_related_post_slugs_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."groups"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "groups_related_post_slugs_order_idx"
      ON "groups_related_post_slugs" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "groups_related_post_slugs_parent_id_idx"
      ON "groups_related_post_slugs" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "groups_related_post_slugs" CASCADE;
    DROP TABLE IF EXISTS "groups_resources" CASCADE;

    ALTER TABLE "groups"
      DROP COLUMN IF EXISTS "project_c_t_a_type",
      DROP COLUMN IF EXISTS "project_c_t_a_href",
      DROP COLUMN IF EXISTS "project_c_t_a_label",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "category",
      DROP COLUMN IF EXISTS "featured",
      DROP COLUMN IF EXISTS "external",
      DROP COLUMN IF EXISTS "href",
      DROP COLUMN IF EXISTS "image";

    DROP TYPE IF EXISTS "public"."enum_groups_resources_kind";
    DROP TYPE IF EXISTS "public"."enum_groups_project_c_t_a_type";
    DROP TYPE IF EXISTS "public"."enum_groups_status";
    DROP TYPE IF EXISTS "public"."enum_groups_category";
  `);
}
