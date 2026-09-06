import assert from 'node:assert/strict';
import test from 'node:test';

import { submitSubscription } from './subscription-client';

const request = {
  email: 'reader@example.test',
  audiences: ['fiction'] as const,
  source: 'portfolio-piece-end' as const,
  updateMode: 'add' as const,
};

test('subscription client invokes success work only after a successful API response', async () => {
  let successCount = 0;
  let received: RequestInit | undefined;
  const response = await submitSubscription(
    request,
    () => { successCount += 1; },
    async (_input, init) => {
      received = init;
      return Response.json({ ok: true, subscribed: ['fiction'] });
    },
  );

  assert.equal(response.ok, true);
  assert.equal(successCount, 1);
  assert.equal(received?.method, 'POST');
  assert.deepEqual(JSON.parse(String(received?.body)), request);
});

test('subscription client does not invoke success work after an API failure', async () => {
  let successCount = 0;

  await assert.rejects(
    submitSubscription(
      request,
      () => { successCount += 1; },
      async () => Response.json({ ok: false, error: 'Try again.' }, { status: 502 }),
    ),
    /Try again/,
  );

  assert.equal(successCount, 0);
});
