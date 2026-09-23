import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { GET } from '@/app/(frontend)/api/kit/reconcile-confirmations/route';

const originalSecret = process.env.CRON_SECRET;
const originalEnabled = process.env.KIT_RECONCILE_ENABLED;
afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
  if (originalEnabled === undefined) delete process.env.KIT_RECONCILE_ENABLED;
  else process.env.KIT_RECONCILE_ENABLED = originalEnabled;
});

test('reconciliation is opt-in and disabled runs perform no Kit requests', async () => {
  process.env.CRON_SECRET = 'a-secret-with-at-least-16';
  delete process.env.KIT_RECONCILE_ENABLED;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return Response.json({}); };
  try {
    const response = await GET(new Request('https://example.com/api/kit/reconcile-confirmations', {
      headers: { authorization: 'Bearer a-secret-with-at-least-16' },
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      skipped: true,
      reason: 'reconciliation_not_enabled',
    });
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reconciliation endpoint rejects requests without the cron bearer secret', async () => {
  process.env.CRON_SECRET = 'a-secret-with-at-least-16';
  const response = await GET(new Request('https://example.com/api/kit/reconcile-confirmations'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
});
