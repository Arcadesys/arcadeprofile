import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "groups"
    ADD COLUMN IF NOT EXISTS "serial_release_schedule_enabled" boolean,
    ADD COLUMN IF NOT EXISTS "serial_release_schedule_cadence" varchar,
    ADD COLUMN IF NOT EXISTS "serial_release_schedule_weekday" varchar,
    ADD COLUMN IF NOT EXISTS "serial_release_schedule_time" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "groups"
    DROP COLUMN IF EXISTS "serial_release_schedule_enabled",
    DROP COLUMN IF EXISTS "serial_release_schedule_cadence",
    DROP COLUMN IF EXISTS "serial_release_schedule_weekday",
    DROP COLUMN IF EXISTS "serial_release_schedule_time";
  `);
}
