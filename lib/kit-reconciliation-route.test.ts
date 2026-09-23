import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { GET } from '@/app/(frontend)/api/kit/reconcile-confirmations/route';

const names = ['CRON_SECRET', 'KIT_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; } });

test('verified-signup reconciliation requires the cron bearer secret', async () => {
  process.env.CRON_SECRET = 'cron-secret-with-at-least-16';
  const response = await GET(new Request('https://example.com/api/kit/reconcile-confirmations'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
});

test('cron stays fail-closed when Kit or the Redis ledger is not configured', async () => {
  process.env.CRON_SECRET = 'cron-secret-with-at-least-16';
  delete process.env.KIT_API_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const response = await GET(new Request('https://example.com/api/kit/reconcile-confirmations', {
    headers: { authorization: 'Bearer cron-secret-with-at-least-16' },
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'not_configured' });
});

test('cron accepts Vercel-injected Upstash credentials', async () => {
  process.env.CRON_SECRET = 'cron-secret-with-at-least-16';
  process.env.KIT_API_KEY = 'kit-test';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.KV_REST_API_URL = 'https://redis.example';
  process.env.KV_REST_API_TOKEN = 'kv-test';
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://redis.example');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer kv-test');
    return Response.json({ result: [] });
  };
  const response = await GET(new Request('https://example.com/api/kit/reconcile-confirmations', {
    headers: { authorization: 'Bearer cron-secret-with-at-least-16' },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, checked: 0, tagged: 0, pending: 0, failed: 0, remaining: 0 });
});
