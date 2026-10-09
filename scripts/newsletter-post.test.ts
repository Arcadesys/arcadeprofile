import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test, type TestContext } from "node:test";

const script = fileURLToPath(new URL("./newsletter-post.ts", import.meta.url));
const tsx = import.meta.resolve("tsx");
const slug = "fixture-essay";

// Every request is intercepted in a fresh child process. No production
// environment, credentials, contacts, or provider network calls are used.
const mockFetch = `
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
globalThis.fetch = async (url, init) => {
  const address = String(url);
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  appendFileSync("calls.jsonl", JSON.stringify({ url: address, method: init?.method, body }) + "\\n");
  if (address === "https://example.invalid/projects/arcade-blog/fixture-essay") {
    return new Response("Fixture", { status: process.env.MOCK_MODE === "unpublished" ? 404 : 200 });
  }
  if (address === "https://api.postmarkapp.com/email") {
    assert.equal(body.To, "preview@example.invalid");
    return Response.json({ ErrorCode: 0, MessageID: "fixture-preview" });
  }
  assert.equal(address, "https://api.kit.com/v4/broadcasts", "Unexpected request is never sent to the network");
  assert.equal(init.method, "POST");
  const receipt = JSON.parse(readFileSync("data/newsletter-sends/fixture-essay.kit.json", "utf8"));
  assert.equal(receipt.attempts.at(-1).status, "pending", "Pending receipt must exist before provider submission");
  assert.equal(existsSync("data/newsletter-sends/fixture-essay.kit.json.lock"), true);
  writeFileSync("provider-entered", "yes");
  if (process.env.MOCK_MODE === "hold") {
    while (!existsSync("provider-release")) await delay(10);
  }
  if (process.env.MOCK_MODE === "timeout") throw new DOMException("Fixture timeout", "TimeoutError");
  if (process.env.MOCK_MODE === "missing-receipt") return Response.json({});
  if (process.env.MOCK_MODE === "unscheduled") return Response.json({ broadcast: { id: 44, send_at: null } });
  if (process.env.MOCK_MODE === "provider-error") return new Response("Fixture error", { status: 503 });
  if (process.env.MOCK_MODE === "receipt-write-error") {
    mkdirSync("data/newsletter-sends/fixture-essay.kit.json." + process.pid + ".tmp");
  }
  return Response.json({ broadcast: { id: 44, send_at: body.send_at } }, { status: 201 });
};
`;

type Call = { url: string; method?: string; body?: Record<string, unknown> };
type Result = { code: number | null; signal: NodeJS.Signals | null; output: string };

function fixture(t: TestContext) {
  const root = mkdtempSync(path.join(tmpdir(), "newsletter-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const group = path.join(root, "content/posts/arcade-blog");
  mkdirSync(group, { recursive: true });
  writeFileSync(path.join(group, "_group.json"), JSON.stringify({ slug: "arcade-blog", title: "Fixture essays" }));
  writeFileSync(path.join(group, `${slug}.md`), `---\nid: fixture-essay\ntitle: Fixture essay\nslug: ${slug}\ngroup: arcade-blog\npublishDate: "2020-01-01T00:00:00Z"\n---\nA fixture essay.\n`);
  const preload = path.join(root, "mock-fetch.mjs");
  writeFileSync(preload, mockFetch);
  const receipt = path.join(root, `data/newsletter-sends/${slug}.kit.json`);
  const calls = () => existsSync(path.join(root, "calls.jsonl"))
    ? readFileSync(path.join(root, "calls.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Call)
    : [];
  const start = (args: string[] = ["--send"], mode = "success", env: Record<string, string> = {}) => {
    const child = spawn(process.execPath, ["--import", tsx, "--import", pathToFileURL(preload).href, script, "--slug", slug, ...args], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        NEXT_PUBLIC_SITE_URL: "https://example.invalid",
        KIT_API_KEY: "fixture-only-key",
        KIT_TAG_ALL_WRITING_ID: "1",
        KIT_TAG_ESSAYS_ID: "2",
        POSTMARK_SERVER_TOKEN: "fixture-only-key",
        POSTMARK_FROM_EMAIL: "sender@example.invalid",
        MOCK_MODE: mode,
        ...env,
      },
    });
    t.after(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
    let output = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { output += data; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 15000);
    const result = new Promise<Result>((resolve, reject) => {
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal, output }); });
    });
    return { child, result };
  };
  const seed = (extension: string, data: unknown) => {
    mkdirSync(path.dirname(receipt), { recursive: true });
    writeFileSync(path.join(path.dirname(receipt), `${slug}${extension}`), JSON.stringify(data));
  };
  return { root, receipt, lock: `${receipt}.lock`, calls, start, seed };
}

async function waitForProvider(root: string) {
  for (let index = 0; index < 400; index += 1) {
    if (existsSync(path.join(root, "provider-entered"))) return;
    await delay(25);
  }
  assert.fail("Mock provider was not reached within ten seconds");
}

function broadcasts(calls: Call[]) { return calls.filter((call) => call.url === "https://api.kit.com/v4/broadcasts"); }

test("CLI dry run is read-only and preview addresses only the explicit test recipient", async (t) => {
  const f = fixture(t);
  const dryRun = await f.start([]).result;
  assert.equal(dryRun.code, 0, dryRun.output);
  assert.match(dryRun.output, /"mode": "dry-run"/);
  assert.deepEqual(f.calls(), []);
  assert.equal(existsSync(f.receipt), false);
  assert.equal(existsSync(f.lock), false);
  const preview = await f.start(["--preview-to", "preview@example.invalid"]).result;
  assert.equal(preview.code, 0, preview.output);
  assert.equal(f.calls().length, 1);
  assert.equal(broadcasts(f.calls()).length, 0);
  assert.equal(existsSync(f.receipt), false);
});

test("CLI stores a non-address receipt, blocks repeats, and requires an explicit resend reason", async (t) => {
  const f = fixture(t);
  const sent = await f.start().result;
  assert.equal(sent.code, 0, sent.output);
  const receipt = JSON.parse(readFileSync(f.receipt, "utf8"));
  assert.equal(receipt.attempts[0].status, "scheduled");
  assert.equal(receipt.attempts[0].broadcastId, 44);
  assert.equal(existsSync(f.lock), false);
  assert.doesNotMatch(readFileSync(f.receipt, "utf8"), /@|fixture-only-key/);
  assert.deepEqual(broadcasts(f.calls())[0].body?.subscriber_filter, [{ all: null, any: [{ type: "tag", ids: [1, 2] }], none: null }]);
  for (const args of [["--send"], ["--send", "--resend"], ["--send", "--resend", "--reason", " "]]) {
    const blocked = await f.start(args).result;
    assert.equal(blocked.code, 1, blocked.output);
  }
  assert.equal(broadcasts(f.calls()).length, 1);
  const resent = await f.start(["--send", "--resend", "--reason", "Approved fixture correction"]).result;
  assert.equal(resent.code, 0, resent.output);
  assert.equal(broadcasts(f.calls()).length, 2);
  assert.equal(JSON.parse(readFileSync(f.receipt, "utf8")).attempts[1].reason, "Approved fixture correction");
});

test("CLI refuses a resend when local history is missing", async (t) => {
  const f = fixture(t);
  const result = await f.start(["--send", "--resend", "--reason", "Fixture"]).result;
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /requires a prior scheduled broadcast/);
  assert.equal(broadcasts(f.calls()).length, 0);
  assert.equal(existsSync(f.receipt), false);
  assert.equal(existsSync(f.lock), false);
});

test("CLI fails closed before provider submission for unpublished essays and missing config", async (t) => {
  const f = fixture(t);
  for (const [mode, env] of [["unpublished", {}], ["success", { KIT_API_KEY: "" }], ["success", { KIT_TAG_ESSAYS_ID: "" }]] as const) {
    const result = await f.start(["--send"], mode, env).result;
    assert.equal(result.code, 1, result.output);
  }
  assert.equal(broadcasts(f.calls()).length, 0);
  assert.equal(existsSync(f.receipt), false);
});

test("CLI serializes concurrent processes sharing the same receipt directory", async (t) => {
  const f = fixture(t);
  const first = f.start(["--send"], "hold");
  await waitForProvider(f.root);
  const second = await f.start().result;
  assert.equal(second.code, 1, second.output);
  assert.match(second.output, /active or interrupted send lock/);
  assert.equal(broadcasts(f.calls()).length, 1);
  writeFileSync(path.join(f.root, "provider-release"), "yes");
  const result = await first.result;
  assert.equal(result.code, 0, result.output);
  assert.equal(existsSync(f.lock), false);
  assert.equal(JSON.parse(readFileSync(f.receipt, "utf8")).attempts.length, 1);
});

for (const mode of ["timeout", "missing-receipt", "unscheduled", "provider-error", "receipt-write-error"]) {
  test(`CLI retains pending history after ${mode} and never automatically retries`, async (t) => {
    const f = fixture(t);
    const first = await f.start(["--send"], mode).result;
    assert.equal(first.code, 1, first.output);
    assert.equal(existsSync(f.lock), false, "Normal errors release only the concurrency lock");
    assert.equal(JSON.parse(readFileSync(f.receipt, "utf8")).attempts[0].status, "pending");
    for (const args of [["--send"], ["--send", "--resend", "--reason", "Fixture retry"]]) {
      const retry = await f.start(args).result;
      assert.equal(retry.code, 1, retry.output);
      assert.match(retry.output, /ambiguous result/);
    }
    assert.equal(broadcasts(f.calls()).length, 1);
  });
}

test("CLI crash leaves a blocking lock even if its pending receipt is later lost", async (t) => {
  const f = fixture(t);
  const first = f.start(["--send"], "hold");
  await waitForProvider(f.root);
  first.child.kill("SIGKILL");
  assert.equal((await first.result).signal, "SIGKILL");
  assert.equal(existsSync(f.lock), true);
  assert.equal(JSON.parse(readFileSync(f.receipt, "utf8")).attempts[0].status, "pending");
  rmSync(f.receipt);
  const retry = await f.start().result;
  assert.equal(retry.code, 1, retry.output);
  assert.match(retry.output, /active or interrupted send lock/);
  assert.equal(broadcasts(f.calls()).length, 1);
});

test("CLI honors interrupted legacy and email-service receipt guards", async (t) => {
  for (const [extension, data, expected] of [
    [".json", { attempts: [{ id: "legacy-pending" }] }, /interrupted legacy/],
    [".service.json", [{ status: "pending" }], /interrupted email-service/],
    [".json", { attempts: [{ completedAt: "2026-01-01T00:00:00Z" }] }, /already has a scheduled/],
    [".service.json", [{ status: "accepted" }], /already has a scheduled/],
  ] as const) {
    const f = fixture(t);
    f.seed(extension, data);
    const result = await f.start().result;
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, expected);
    assert.equal(broadcasts(f.calls()).length, 0);
    assert.equal(existsSync(f.lock), false);
  }
});

test("CLI blocks corrupt receipt attempts and pending history hidden before a scheduled attempt", async (t) => {
  for (const attempts of [
    [null],
    [{ id: "unknown", status: "unknown" }],
    [{ id: "bad-receipt", status: "scheduled", broadcastId: 0 }],
    [{ id: "pending", status: "pending" }, { id: "later", status: "scheduled", broadcastId: 44 }],
  ]) {
    const f = fixture(t);
    f.seed(".kit.json", { version: 1, slug, attempts });
    const result = await f.start().result;
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /invalid attempt|ambiguous result/);
    assert.equal(broadcasts(f.calls()).length, 0);
    assert.equal(existsSync(f.lock), false);
  }
});
