import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { GET } from '@/app/(frontend)/api/kit/reconcile-confirmations/route';

const originalSecret = process.env.CRON_SECRET;
afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

test('reconciliation endpoint rejects requests without the cron bearer secret', async () => {
  process.env.CRON_SECRET = 'a-secret-with-at-least-16';
  const response = await GET(new Request('https://example.com/api/kit/reconcile-confirmations'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
});
