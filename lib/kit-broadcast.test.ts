import assert from "node:assert/strict";
import { test } from "node:test";
import { createAndScheduleKitBroadcast, getEssayTagIds, hashTagAudience } from "./kit-broadcast";

test("essay audience uses All Writing OR Essays tags and hashes them without order", () => {
  const ids = getEssayTagIds({ KIT_TAG_ALL_WRITING_ID: "23851250", KIT_TAG_ESSAYS_ID: "23851252" });
  assert.deepEqual(ids, [23851250, 23851252]);
  assert.equal(hashTagAudience(ids), hashTagAudience([...ids].reverse()));
});

test("Kit broadcast is scheduled with a deduping any-tag filter", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const result = await createAndScheduleKitBroadcast({
    apiKey: "test-key",
    subject: "Essay",
    description: "Essay: Essay",
    content: "<p>Body</p>",
    tagIds: [23851250, 23851252],
    sendAt: "2026-09-23T15:00:00.000Z",
    fetchImpl: async (url, init) => {
      assert.equal(String(url), "https://api.kit.com/v4/broadcasts");
      assert.equal(new Headers(init?.headers).get("X-Kit-Api-Key"), "test-key");
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ broadcast: { id: 44, send_at: "2026-09-23T15:00:00Z" } }, { status: 201 });
    },
  });
  assert.deepEqual(requestBody?.subscriber_filter, [{
    all: null,
    any: [{ type: "tag", ids: [23851250, 23851252] }],
    none: null,
  }]);
  assert.equal(requestBody?.send_at, "2026-09-23T15:00:00.000Z");
  assert.deepEqual(result, { id: 44, sendAt: "2026-09-23T15:00:00Z" });
});

test("missing tag ids fail closed before a broadcast request", () => {
  assert.throws(() => getEssayTagIds({ KIT_TAG_ALL_WRITING_ID: "23851250" }), /KIT_TAG_ESSAYS_ID/);
});
