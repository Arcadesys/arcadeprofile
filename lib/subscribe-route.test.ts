import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/(frontend)/api/subscribe/route";
const originalFetch = globalThis.fetch;
const originalUrl = process.env.EMAIL_SERVICE_URL;
const originalKey = process.env.EMAIL_SERVICE_SUBSCRIBE_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EMAIL_SERVICE_URL;
  else process.env.EMAIL_SERVICE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.EMAIL_SERVICE_SUBSCRIBE_KEY;
  else process.env.EMAIL_SERVICE_SUBSCRIBE_KEY = originalKey;
});
function configure() {
  process.env.EMAIL_SERVICE_URL = "https://email.example.com";
  process.env.EMAIL_SERVICE_SUBSCRIBE_KEY = "test-key";
}
function request(body: unknown) {
  return new NextRequest("https://example.com/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
for (const updateMode of ["add", "replace"])
  test(`${updateMode} preferences cross one vendor-neutral boundary with consent policy`, async () => {
    configure();
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(String(url), "https://email.example.com/v1/subscribers");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test-key",
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: "reader@example.com",
        audiences: ["lab"],
        source: "subscribe-page",
        updateMode,
        policy: "writing-updates-v1",
      });
      return Response.json({ ok: true, audiences: ["lab"], suppressed: false });
    };
    const response = await POST(
      request({
        email: "reader@example.com",
        audiences: ["lab"],
        source: "subscribe-page",
        updateMode,
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, subscribed: ["lab"] });
    assert.equal(calls, 1);
  });
test("service failure cannot report subscription success", async () => {
  configure();
  globalThis.fetch = async () => new Response("", { status: 503 });
  assert.equal(
    (await POST(request({ email: "reader@example.com", audiences: ["all"] })))
      .status,
    502,
  );
});
test("suppressed address remains blocked and magnet is not exposed as success", async () => {
  configure();
  globalThis.fetch = async () =>
    Response.json({ ok: true, audiences: ["all"], suppressed: true });
  assert.equal(
    (
      await POST(
        request({
          email: "reader@example.com",
          audiences: ["all"],
          magnet: "story",
        }),
      )
    ).status,
    409,
  );
});
