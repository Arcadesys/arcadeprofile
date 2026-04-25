import assert from 'node:assert/strict';
import test from 'node:test';

import { handlePostmarkWebhook } from './postmark-webhook-handler';

function withEnv<T>(key: string, value: string | undefined, fn: () => Promise<T>) {
  const previous = process.env[key];

  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }

  return fn().finally(() => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  });
}

test('rejects webhook when POSTMARK_WEBHOOK_SECRET is set and token is missing', async () => {
  await withEnv('POSTMARK_WEBHOOK_SECRET', 'secret123', async () => {
    const response = await handlePostmarkWebhook(new Request('https://example.com/api/postmark/webhook'), {
      payload: {
        find: async () => ({ docs: [] }),
        update: async () => ({}),
      },
    });

    assert.equal(response.status, 401);
  });
});

test('unsubscribes matching active subscribers on bounce events', async () => {
  const updates: unknown[] = [];

  await withEnv('POSTMARK_WEBHOOK_SECRET', undefined, async () => {
    const response = await handlePostmarkWebhook(
      new Request('https://example.com/api/postmark/webhook', {
        method: 'POST',
        body: JSON.stringify({
          RecordType: 'Bounce',
          Email: 'reader@example.com',
          MessageID: 'pm-123',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
      {
        payload: {
          find: async () => ({
            docs: [
              { id: 1, unsubscribed: false },
              { id: 2, unsubscribed: true },
            ],
          }),
          update: async (args) => {
            updates.push(args);
            return {};
          },
        },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(updates.length, 1);
    assert.deepEqual(await response.json(), {
      ok: true,
      updatedSubscribers: 1,
      recordType: 'Bounce',
    });
  });
});

test('does not unsubscribe on delivery events', async () => {
  let findCalls = 0;

  await withEnv('POSTMARK_WEBHOOK_SECRET', undefined, async () => {
    const response = await handlePostmarkWebhook(
      new Request('https://example.com/api/postmark/webhook', {
        method: 'POST',
        body: JSON.stringify({
          RecordType: 'Delivery',
          Recipient: 'reader@example.com',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
      {
        payload: {
          find: async () => {
            findCalls += 1;
            return { docs: [] };
          },
          update: async () => ({}),
        },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(findCalls, 0);
    assert.deepEqual(await response.json(), {
      ok: true,
      updatedSubscribers: 0,
      recordType: 'Delivery',
    });
  });
});
