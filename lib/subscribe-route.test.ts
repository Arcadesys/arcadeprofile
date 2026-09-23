import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/(frontend)/api/subscribe/route";
const originalFetch = globalThis.fetch;
const originalSecret = process.env.KIT_API_SECRET;
const originalFormIds = Object.fromEntries(
  ["ALL", "FICTION", "ESSAYS", "LAB"].map((name) => [`KIT_FORM_${name}_ID`, process.env[`KIT_FORM_${name}_ID`]]),
);
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.KIT_API_SECRET;
  else process.env.KIT_API_SECRET = originalSecret;
  for (const [name, value] of Object.entries(originalFormIds)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
function configure() {
  process.env.KIT_API_SECRET = "test-secret";
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
test("selected preferences subscribe through their double opt-in Kit forms", async () => {
    configure();
    const calls: string[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push(String(url));
      assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        api_secret: "test-secret",
        email: "reader@example.com",
      });
      return Response.json({ subscription: { id: 1 } });
    };
    const response = await POST(
      request({
        email: "reader@example.com",
        audiences: ["lab"],
        source: "subscribe-page",
        updateMode: "replace",
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      subscribed: ["lab"],
      confirmationRequired: true,
    });
    assert.deepEqual(calls, ["https://api.convertkit.com/v3/forms/104/subscribe"]);
  });
test("Kit failure cannot report subscription success", async () => {
  configure();
  globalThis.fetch = async () => new Response("", { status: 503 });
  assert.equal(
    (await POST(request({ email: "reader@example.com", audiences: ["all"] })))
      .status,
    502,
  );
});
