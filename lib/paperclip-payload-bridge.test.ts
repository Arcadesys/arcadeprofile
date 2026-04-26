import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BridgeValidationError,
  authenticateBridgeRequest,
  authorizeBridgeRequest,
  buildBridgeConfigFromEnv,
  clampRequestedLimit,
  computePaperclipSignature,
  parseBridgeRequest,
} from './paperclip-payload-bridge';

const baseEnv = {
  PAPERCLIP_PAYLOAD_SHARED_SECRET: 'super-secret',
  PAPERCLIP_PAYLOAD_COLLECTION_RULES: JSON.stringify({
    posts: {
      operations: ['find', 'findByID', 'create', 'update'],
      maxLimit: 5,
      maxDepth: 1,
      readFields: ['id', 'title', 'slug', 'updatedAt'],
      writeFields: ['title', 'slug', 'excerpt', 'content', 'publishedDate'],
    },
  }),
  PAPERCLIP_PAYLOAD_AGENT_RULES: JSON.stringify({
    agent_cto: {
      collections: ['posts'],
    },
  }),
} satisfies Partial<NodeJS.ProcessEnv>;

test('authenticateBridgeRequest accepts a valid signature', () => {
  const config = buildBridgeConfigFromEnv(baseEnv);
  const rawBody = JSON.stringify({
    op: 'find',
    collection: 'posts',
    limit: 1,
  });
  const timestamp = Date.now().toString();
  const signature = computePaperclipSignature({
    timestamp,
    rawBody,
    sharedSecret: baseEnv.PAPERCLIP_PAYLOAD_SHARED_SECRET,
  });
  const headers = new Headers({
    'x-paperclip-agent': 'agent_cto',
    'x-paperclip-timestamp': timestamp,
    'x-paperclip-signature': signature,
  });

  const result = authenticateBridgeRequest({
    headers,
    rawBody,
    config,
    nowMs: Date.now(),
  });

  assert.equal(result.agentId, 'agent_cto');
});

test('authenticateBridgeRequest rejects stale timestamps', () => {
  const config = buildBridgeConfigFromEnv(baseEnv);
  const rawBody = JSON.stringify({
    op: 'find',
    collection: 'posts',
    limit: 1,
  });
  const oldTimestamp = '1700000000000';
  const signature = computePaperclipSignature({
    timestamp: oldTimestamp,
    rawBody,
    sharedSecret: baseEnv.PAPERCLIP_PAYLOAD_SHARED_SECRET,
  });
  const headers = new Headers({
    'x-paperclip-agent': 'agent_cto',
    'x-paperclip-timestamp': oldTimestamp,
    'x-paperclip-signature': signature,
  });

  assert.throws(
    () =>
      authenticateBridgeRequest({
        headers,
        rawBody,
        config,
        nowMs: Number(oldTimestamp) + config.maxClockSkewMs + 1,
      }),
    (error: unknown) =>
      error instanceof BridgeValidationError && error.message === 'Stale Paperclip timestamp',
  );
});

test('authorizeBridgeRequest rejects collection access outside the agent allowlist', () => {
  const config = buildBridgeConfigFromEnv(baseEnv);
  const request = parseBridgeRequest(
    JSON.stringify({
      op: 'find',
      collection: 'groups',
    }),
  );

  assert.throws(
    () =>
      authorizeBridgeRequest({
        config,
        agentId: 'agent_cto',
        request,
      }),
    (error: unknown) =>
      error instanceof BridgeValidationError
      && error.message === 'Agent is not allowed to access this collection',
  );
});

test('clampRequestedLimit enforces the collection maximum', () => {
  const config = buildBridgeConfigFromEnv(baseEnv);
  const limit = clampRequestedLimit(20, config.collections.posts!, config.defaultLimit);

  assert.equal(limit, 5);
});

test('parseBridgeRequest rejects malformed JSON', () => {
  assert.throws(
    () => parseBridgeRequest('{'),
    (error: unknown) =>
      error instanceof BridgeValidationError && error.message === 'Malformed JSON body',
  );
});
