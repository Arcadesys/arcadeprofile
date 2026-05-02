import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "nav_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "href" varchar NOT NULL,
      "order" numeric NOT NULL DEFAULT 10,
      "visible" boolean DEFAULT true,
      "is_primary" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "nav_items" CASCADE;
  `);
}
