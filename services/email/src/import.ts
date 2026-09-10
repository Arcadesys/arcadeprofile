// Offline, local-only migration. Run while the service is stopped.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { Store } from "./store.js";
import { email, audience } from "./contracts.js";
const schema = z
  .object({
    subscribers: z.array(
      z
        .object({
          email,
          audiences: z.array(audience).min(1),
          source: z.string().min(1),
          policy: z.string().min(1),
          consentedAt: z.iso.datetime(),
          evidence: z.string().min(1),
        })
        .strict(),
    ),
    suppressions: z.array(
      z
        .object({
          email,
          reason: z.enum(["unsubscribed", "bounced", "complained", "manual"]),
          source: z.string().min(1),
          occurredAt: z.iso.datetime(),
        })
        .strict(),
    ),
  })
  .strict();
export function importRecords(store: Store, raw: unknown) {
  const input = schema.parse(raw);
  if (
    new Set(input.subscribers.map((s) => s.email)).size !==
    input.subscribers.length
  )
    throw new Error("Duplicate subscriber addresses");
  store.db.transaction(() => {
    if (
      store.db.prepare("SELECT 1 FROM subscribers LIMIT 1").get() ||
      store.db.prepare("SELECT 1 FROM jobs LIMIT 1").get()
    )
      throw new Error("Import requires an empty subscriber/job database");
    for (const record of input.suppressions)
      store.suppress(
        record.email,
        record.reason,
        record.source,
        record.occurredAt,
      );
    for (const record of input.subscribers) {
      const audiences = JSON.stringify([...new Set(record.audiences)].sort());
      store.db
        .prepare("INSERT INTO subscribers VALUES(?,?,?)")
        .run(record.email, audiences, record.consentedAt);
      store.db
        .prepare(
          "INSERT INTO consent(email,audiences,mode,source,policy,recorded_at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          record.email,
          audiences,
          "import",
          `${record.source}: ${record.evidence}`,
          record.policy,
          record.consentedAt,
        );
    }
  })();
  return {
    subscribers: input.subscribers.length,
    suppressions: input.suppressions.length,
  };
}
if (process.argv[1]?.endsWith("/import.ts")) {
  const [file, database] = process.argv.slice(2);
  if (!file || !database)
    throw new Error(
      "Usage: npm run import -- source.json /private/email.sqlite",
    );
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  const store = new Store(database);
  try {
    console.log(importRecords(store, raw));
  } finally {
    store.db.close();
  }
}
