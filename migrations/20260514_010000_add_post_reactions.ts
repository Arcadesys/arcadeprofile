import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Adds the `post_reactions` table — one row per (post, emoji, clientId) for
 * the Slack-style reaction bar on published posts. ON DELETE CASCADE on the
 * post FK so deleting a post removes its reactions. The unique index on
 * (post_id, emoji, client_id) enforces toggle semantics even under a
 * double-click race; the app code also checks-then-acts.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "post_reactions" (
      "id" serial PRIMARY KEY NOT NULL,
      "post_id" integer NOT NULL,
      "emoji" varchar NOT NULL,
      "client_id" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "post_reactions"
        ADD CONSTRAINT "post_reactions_post_id_fk"
        FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "post_reactions_post_id_idx"
      ON "post_reactions" USING btree ("post_id");
    CREATE INDEX IF NOT EXISTS "post_reactions_client_id_idx"
      ON "post_reactions" USING btree ("client_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "post_reactions_post_emoji_client_unique_idx"
      ON "post_reactions" ("post_id", "emoji", "client_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "post_reactions" CASCADE;
  `);
}
