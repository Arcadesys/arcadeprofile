import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "./store.js";
import { EmailService } from "./service.js";
import { KitAdapter, postmarkTransactional } from "./adapters.js";
import { ingestKit, ingestPostmark, validSignature } from "./webhooks.js";
import { subscription, type Broadcast } from "./contracts.js";
const input = (audiences: string[], updateMode = "replace") =>
  subscription.parse({
    email: "Reader@Example.com",
    audiences,
    updateMode,
    source: "post",
    policy: "writing-updates-v1",
  });
const message = (): Broadcast => ({
  id: randomUUID(),
  publicationKey: "essay:test",
  subject: "Essay",
  htmlBody: "<p>Essay</p>",
  textBody: "Essay",
  audiences: ["all", "essays"],
});
function event(type: string, id = randomUUID()) {
  return {
    events: [
      {
        id,
        type,
        created: "2026-09-10T12:00:00Z",
        data: { subscriber: { email_address: "reader@example.com" } },
      },
    ],
  };
}
test("preferences add and replace atomically, consent and suppressions survive restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "email-"));
  const file = join(dir, "db.sqlite");
  let store = new Store(file);
  try {
    store.subscribe(input(["fiction"]));
    store.subscribe(input(["essays"], "add"));
    assert.deepEqual(store.recipients(["fiction"]), ["reader@example.com"]);
    store.subscribe(input(["lab"]));
    assert.deepEqual(store.recipients(["essays"]), []);
    ingestKit(store, event("subscriber.complained"));
    store.db.close();
    store = new Store(file);
    assert.equal(store.subscribe(input(["all"])).suppressed, true);
    assert.deepEqual(store.recipients(["all"]), []);
    assert.equal((store.export().consent as unknown[]).length, 4);
  } finally {
    store.db.close();
    rmSync(dir, { recursive: true });
  }
});
test("batched duplicate and reordered events never reactivate; unknown addresses are tombstoned", () => {
  const store = new Store(":memory:");
  const unsub = event("subscriber.unsubscribed");
  ingestKit(store, unsub);
  ingestKit(store, unsub);
  ingestKit(store, event("subscriber.activated"));
  assert.equal((store.export().events as unknown[]).length, 2);
  assert.equal(store.subscribe(input(["all"])).suppressed, true);
  assert.equal(store.suppressed("reader@example.com", true), false);
  ingestKit(store, event("subscriber.bounced"));
  assert.equal(store.suppressed("reader@example.com", true), true);
  store.db.close();
});
test("signatures cover exact bytes, reject stale/NaN timestamps, allow rotation", () => {
  const now = Date.now(),
    t = Math.floor(now / 1000);
  const raw = '{"events":[]}';
  const secret = "test-secret";
  const sig = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  assert.equal(
    validSignature(raw, `t=${t},v1=bad,v1=${sig}`, secret, now),
    true,
  );
  for (const header of [
    `t=NaN,v1=${sig}`,
    `t=${t - 301},v1=${sig}`,
    `t=${t},t=${t},v1=${sig}`,
  ])
    assert.equal(validSignature(raw, header, secret, now), false);
  assert.equal(
    validSignature(`${raw} `, `t=${t},v1=${sig}`, secret, now),
    false,
  );
});
test("suppression arriving during preparation prevents send", async () => {
  const store = new Store(":memory:");
  store.subscribe(input(["essays"]));
  let sends = 0;
  const service = new EmailService(
    store,
    {
      async prepare() {
        ingestKit(store, event("subscriber.unsubscribed"));
        return { tagId: 1, eligible: ["reader@example.com"] };
      },
      async send() {
        sends++;
        return { providerId: "1" };
      },
    },
    async () => ({ providerId: "1" }),
    true,
  );
  await assert.rejects(service.broadcast(message()), /Audience changed/);
  assert.equal(sends, 0);
  store.db.close();
});
test("accepted, concurrent and uncertain requests are never sent twice", async () => {
  const store = new Store(":memory:");
  store.subscribe(input(["all"]));
  let sends = 0;
  const service = new EmailService(
    store,
    {
      async prepare() {
        return { tagId: 1, eligible: ["reader@example.com"] };
      },
      async send() {
        sends++;
        return { providerId: "1" };
      },
    },
    async () => {
      throw new Error("timeout");
    },
    true,
  );
  const msg = message();
  await Promise.all([service.broadcast(msg), service.broadcast(msg)]);
  assert.equal(sends, 1);
  await service.broadcast(msg);
  assert.equal(sends, 1);
  await assert.rejects(
    service.broadcast({ ...msg, id: randomUUID() }),
    /already accepted/,
  );
  await assert.rejects(
    service.broadcast({ ...msg, subject: "changed" }),
    /Idempotency/,
  );
  const txn = {
    id: randomUUID(),
    to: "reader@example.com",
    subject: "Test",
    htmlBody: "Test",
    textBody: "Test",
  };
  await assert.rejects(service.transactional(txn));
  assert.equal((await service.transactional(txn)).status, "needs_review");
  store.db.close();
});
test("Kit adapter filters every broadcast and preserves vendor suppressions", async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const responses = [
    { tag: { id: 42 } },
    { subscriber: { id: 1, state: "cancelled" } },
    { subscriber: { id: 2, state: "active" } },
    { subscriber: { id: 2 } },
    { broadcast: { id: 7 } },
  ];
  const mock: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json(responses.shift());
  };
  const adapter = new KitAdapter("key", "sender@example.com", mock);
  const suppressed: string[] = [];
  const prepared = await adapter.prepare(
    randomUUID(),
    ["one@example.com", "two@example.com"],
    (email) => suppressed.push(email),
  );
  assert.deepEqual(suppressed, ["one@example.com"]);
  assert.deepEqual(prepared.eligible, ["two@example.com"]);
  await adapter.send(message(), prepared.tagId);
  assert.deepEqual(requests.at(-1)?.body.subscriber_filter, [
    { all: [{ type: "tag", ids: [42] }] },
  ]);
  assert.equal(requests.at(-1)?.body.public, false);
  await assert.rejects(adapter.send(message(), 0));
});
test("transactional adapter uses transactional stream, reports provider rejection", async () => {
  const txn = {
    id: randomUUID(),
    to: "reader@example.com",
    subject: "Test",
    htmlBody: "Test",
    textBody: "Test",
  };
  await assert.rejects(
    postmarkTransactional(
      txn,
      { token: "key", from: "sender@example.com", stream: "outbound" },
      async () => Response.json({ ErrorCode: 406, MessageID: "" }),
    ),
  );
  const result = await postmarkTransactional(
    txn,
    { token: "key", from: "sender@example.com", stream: "outbound" },
    async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).MessageStream, "outbound");
      return Response.json({ ErrorCode: 0, MessageID: "abc" });
    },
  );
  assert.equal(result.providerId, "abc");
});
test("Postmark complaints and hard bounces block both rails, soft bounces do not", () => {
  const store = new Store(":memory:");
  ingestPostmark(store, {
    RecordType: "Bounce",
    Email: "reader@example.com",
    Type: "SoftBounce",
  });
  assert.equal(store.suppressed("reader@example.com"), false);
  ingestPostmark(store, {
    RecordType: "SpamComplaint",
    Email: "reader@example.com",
  });
  assert.equal(store.suppressed("reader@example.com", true), true);
  store.db.close();
});
test("disabled service makes no delivery mutations", async () => {
  const store = new Store(":memory:");
  const service = new EmailService(
    store,
    {
      async prepare() {
        throw new Error("unexpected");
      },
      async send() {
        throw new Error("unexpected");
      },
    },
    async () => {
      throw new Error("unexpected");
    },
    false,
  );
  await assert.rejects(service.broadcast(message()), /disabled/);
  assert.deepEqual(store.export().jobs, []);
  store.db.close();
});

test("offline migration preserves consent time and imports suppression before subscribers", async () => {
  const { importRecords } = await import("./import.js");
  const store = new Store(":memory:");
  const payload = {
    subscribers: [
      {
        email: "reader@example.com",
        audiences: ["essays"],
        source: "legacy",
        policy: "original",
        consentedAt: "2026-01-01T00:00:00Z",
        evidence: "record-123",
      },
    ],
    suppressions: [
      {
        email: "reader@example.com",
        reason: "unsubscribed",
        source: "legacy",
        occurredAt: "2026-02-01T00:00:00Z",
      },
    ],
  };
  assert.deepEqual(importRecords(store, payload), {
    subscribers: 1,
    suppressions: 1,
  });
  assert.deepEqual(store.recipients(["essays"]), []);
  assert.equal(
    (store.export().consent as { recorded_at: string }[])[0].recorded_at,
    "2026-01-01T00:00:00Z",
  );
  assert.throws(() => importRecords(store, payload), /empty/);
  store.db.close();
});

test("Postmark subscription-change reasons preserve hard suppression and tolerate null reactivation fields", () => {
  const store = new Store(":memory:");
  ingestPostmark(store, {
    RecordType: "SubscriptionChange",
    Recipient: "reader@example.com",
    MessageID: null,
    SuppressSending: true,
    SuppressionReason: "HardBounce",
  });
  assert.equal(store.suppressed("reader@example.com", true), true);
  ingestPostmark(store, {
    RecordType: "SubscriptionChange",
    Recipient: "reader@example.com",
    MessageID: null,
    SuppressSending: false,
    SuppressionReason: null,
  });
  assert.equal(store.suppressed("reader@example.com", true), true);
  store.db.close();
});
