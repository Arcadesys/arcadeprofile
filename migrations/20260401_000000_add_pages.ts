import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

async function pagesSchemaExists(db: MigrateUpArgs['db']): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT
      to_regtype('public.enum_pages_status') AS pages_status,
      to_regtype('public.enum__pages_v_version_status') AS pages_version_status,
      to_regclass('public.pages') AS pages,
      to_regclass('public._pages_v') AS pages_versions;
  `);
  const rows = 'rows' in result ? result.rows : result;
  const [row] = rows as {
    pages: string | null;
    pages_status: string | null;
    pages_version_status: string | null;
    pages_versions: string | null;
  }[];

  return Boolean(row?.pages_status && row.pages_version_status && row.pages && row.pages_versions);
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await pagesSchemaExists(db)) {
    return;
  }

  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');

  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"content" jsonb NOT NULL,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );

  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );

  ALTER TABLE "pages" ADD CONSTRAINT "pages_slug_unique" UNIQUE("slug");

  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;

  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE "_pages_v";
  DROP TABLE "pages";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_pages_status";
  `)
}
