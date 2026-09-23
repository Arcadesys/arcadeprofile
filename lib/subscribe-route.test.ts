import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/(frontend)/api/subscribe/route";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.KIT_API_KEY;
const originalFormIds = Object.fromEntries(
  ["ALL", "FICTION", "ESSAYS", "LAB"].map((name) => [`KIT_FORM_${name}_ID`, process.env[`KIT_FORM_${name}_ID`]]),
);
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.KIT_API_KEY;
  else process.env.KIT_API_KEY = originalApiKey;
  for (const [name, value] of Object.entries(originalFormIds)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
function configure() {
  process.env.KIT_API_KEY = "test-key";
  process.env.KIT_FORM_ALL_ID = "101";
  process.env.KIT_FORM_FICTION_ID = "102";
  process.env.KIT_FORM_ESSAYS_ID = "103";
  process.env.KIT_FORM_LAB_ID = "104";
}
function request(body: unknown) {
  return new NextRequest("https://example.com/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("selected preferences create an inactive subscriber then request each double opt-in form", async () => {
  configure();
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    assert.equal(new Headers(init?.headers).get("X-Kit-Api-Key"), "test-key");
    if (String(url) === "https://api.kit.com/v4/subscribers") {
      return Response.json({ subscriber: { id: 55, state: "inactive" } });
    }
    return Response.json({ subscriber: { id: 55 } });
  };
  const response = await POST(request({
    email: "Reader@Example.com",
    audiences: ["fiction", "lab"],
    source: "subscribe-page",
    updateMode: "replace",
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    subscribed: ["fiction", "lab"],
    confirmationRequired: true,
  });
  assert.deepEqual(calls, [
    { url: "https://api.kit.com/v4/subscribers", body: { email_address: "reader@example.com", state: "inactive" } },
    { url: "https://api.kit.com/v4/forms/102/subscribers/55", body: {} },
    { url: "https://api.kit.com/v4/forms/104/subscribers/55", body: {} },
  ]);
});

test("partial form failures are returned without hiding successful requests", async () => {
  configure();
  globalThis.fetch = async (url) => {
    if (String(url) === "https://api.kit.com/v4/subscribers") {
      return Response.json({ subscriber: { id: 55, state: "inactive" } });
    }
    if (String(url).includes("/forms/101/")) return new Response("", { status: 503 });
      return Response.json({ subscriber: { id: 55, state: "inactive" } });
  };
  const response = await POST(request({ email: "reader@example.com", audiences: ["all", "essays"] }));
  assert.equal(response.status, 207);
  assert.deepEqual(await response.json(), {
    ok: false,
    partial: true,
    submitted: ["essays"],
    failed: ["all"],
    confirmationRequired: true,
    error: "Some preferences could not be submitted. Check the failed preferences and try again.",
  });
});

test("a failed inactive-subscriber creation cannot report enrollment", async () => {
  configure();
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("", { status: 503 }); };
  const response = await POST(request({ email: "reader@example.com", audiences: ["all"] }));
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
});

test("an already-active subscriber is not added to another form without fresh confirmation", async () => {
  configure();
  const calls: string[] = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return Response.json({ subscriber: { id: 55, state: "active" } });
  };
  const response = await POST(request({ email: "reader@example.com", audiences: ["fiction", "lab"] }));
  assert.equal(response.status, 207);
  assert.deepEqual(calls, ["https://api.kit.com/v4/subscribers"]);
  const body = await response.json();
  assert.deepEqual(body.failed, ["fiction", "lab"]);
  assert.equal(body.blockedActiveSubscriber, undefined);
  assert.match(body.error, /already active in Kit/);
});
