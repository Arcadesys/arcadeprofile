import Database from "better-sqlite3";
import { readFileSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Subscription, Suppression } from "./contracts.js";
export class Store {
  db: Database.Database;
  constructor(file: string) {
    this.db = new Database(file);
    if (file !== ":memory:") chmodSync(file, 0o600);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = FULL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY)",
    );
    this.db.transaction(() => {
      if (
        !this.db
          .prepare("SELECT version FROM schema_migrations WHERE version=1")
          .get()
      ) {
        this.db.exec(
          readFileSync(
            new URL("../migrations/001.sql", import.meta.url),
            "utf8",
          ),
        );
        this.db.prepare("INSERT INTO schema_migrations VALUES(1)").run();
      }
    })();
  }
  subscribe(input: Subscription) {
    return this.db.transaction(() => {
      const previous = this.db
        .prepare("SELECT audiences FROM subscribers WHERE email=?")
        .get(input.email) as { audiences: string } | undefined;
      const audiences = [
        ...new Set([
          ...input.audiences,
          ...(input.updateMode === "add" && previous
            ? (JSON.parse(previous.audiences) as string[])
            : []),
        ]),
      ].sort();
      const now = new Date().toISOString();
      this.db
        .prepare(
          "INSERT INTO subscribers VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET audiences=excluded.audiences,updated_at=excluded.updated_at",
        )
        .run(input.email, JSON.stringify(audiences), now);
      this.db
        .prepare(
          "INSERT INTO consent(email,audiences,mode,source,policy,recorded_at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          input.email,
          JSON.stringify(input.audiences),
          input.updateMode,
          input.source,
          input.policy,
          now,
        );
      // An unauthenticated signup can never clear a suppression.
      return { audiences, suppressed: this.suppressed(input.email) };
    })();
  }
  suppressed(email: string, transactional = false): boolean {
    return Boolean(
      this.db
        .prepare(
          `SELECT 1 FROM suppressions WHERE email=? ${transactional ? "AND reason != 'unsubscribed'" : ""}`,
        )
        .get(email),
    );
  }
  suppress(email: string, reason: Suppression, source: string, at: string) {
    this.db
      .prepare("INSERT OR IGNORE INTO suppressions VALUES(?,?,?,?)")
      .run(email, reason, source, at);
  }
  event(id: string, action: () => void) {
    this.db.transaction(() => {
      if (this.db.prepare("SELECT 1 FROM events WHERE id=?").get(id)) return;
      action();
      this.db
        .prepare("INSERT INTO events VALUES(?,?)")
        .run(id, new Date().toISOString());
    })();
  }
  recipients(audiences: readonly string[]): string[] {
    const rows = this.db
      .prepare(
        "SELECT email,audiences FROM subscribers WHERE email NOT IN (SELECT email FROM suppressions)",
      )
      .all() as { email: string; audiences: string }[];
    return rows
      .filter((row) =>
        (JSON.parse(row.audiences) as string[]).some((a) =>
          audiences.includes(a),
        ),
      )
      .map((row) => row.email)
      .sort();
  }
  begin(
    id: string,
    payload: unknown,
    publication?: { key: string; resendReason?: string },
  ): { status: string; result: unknown } | null {
    const hash = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    return this.db.transaction(() => {
      const existing = this.db
        .prepare("SELECT * FROM jobs WHERE id=?")
        .get(id) as
        { hash: string; status: string; result: string | null } | undefined;
      if (existing) {
        if (existing.hash !== hash)
          throw new Error("Idempotency key reused with different content");
        return {
          status: existing.status,
          result: existing.result ? JSON.parse(existing.result) : null,
        };
      }
      if (publication) {
        const prior = this.db
          .prepare(
            "SELECT jobs.status FROM publications JOIN jobs ON jobs.id=publications.job_id WHERE publication_key=?",
          )
          .all(publication.key) as { status: string }[];
        if (prior.some((job) => job.status !== "accepted"))
          throw new Error("Publication has an unresolved attempt");
        if (prior.length && !publication.resendReason)
          throw new Error(
            "Publication already accepted; an explicit resend reason is required",
          );
        if (!prior.length && publication.resendReason)
          throw new Error(
            "Cannot resend a publication with no accepted service attempt",
          );
        this.db
          .prepare("INSERT INTO publications VALUES(?,?)")
          .run(id, publication.key);
      }
      this.db
        .prepare("INSERT INTO jobs VALUES(?,?,?,NULL,?)")
        .run(id, hash, "processing", new Date().toISOString());
      return null;
    })();
  }
  finish(id: string, status: string, result: unknown) {
    this.db
      .prepare("UPDATE jobs SET status=?,result=? WHERE id=?")
      .run(status, JSON.stringify(result), id);
  }
  export() {
    return Object.fromEntries(
      [
        "schema_migrations",
        "subscribers",
        "consent",
        "suppressions",
        "events",
        "jobs",
        "publications",
      ].map((table) => [
        table,
        this.db.prepare(`SELECT * FROM ${table}`).all(),
      ]),
    );
  }
}
