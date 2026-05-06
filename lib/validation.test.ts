import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import { parseBody } from './validation.js';

const schema = z.object({
  email: z.string().email(),
  count: z.number().int().nonnegative(),
});

function jsonRequest(body: string): Request {
  return new Request('http://localhost/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

test('parseBody returns data on valid input', async () => {
  const req = jsonRequest(JSON.stringify({ email: 'a@b.co', count: 1 }));
  const result = await parseBody(schema, req);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.data, { email: 'a@b.co', count: 1 });
});

test('parseBody returns 400 with structured issues on schema violation', async () => {
  const req = jsonRequest(JSON.stringify({ email: 'not-an-email', count: -1 }));
  const result = await parseBody(schema, req);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.response.status, 400);
    const body = (await result.response.json()) as { error: string; issues: unknown[] };
    assert.equal(body.error, 'Invalid request body');
    assert.ok(Array.isArray(body.issues));
    assert.equal(body.issues.length, 2);
  }
});

test('parseBody returns 400 on malformed JSON', async () => {
  const req = jsonRequest('{not valid json');
  const result = await parseBody(schema, req);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.response.status, 400);
    const body = (await result.response.json()) as { error: string };
    assert.equal(body.error, 'Invalid JSON body');
  }
});

test('parseBody rejects extra fields when schema is strict (default permissive: extras allowed)', async () => {
  const req = jsonRequest(JSON.stringify({ email: 'a@b.co', count: 1, extra: 'ignored' }));
  const result = await parseBody(schema, req);
  assert.equal(result.ok, true);
});
