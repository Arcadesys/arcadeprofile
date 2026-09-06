import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Vercel preserves Next-generated routing and redirects', () => {
  const config = JSON.parse(readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')) as {
    routes?: unknown;
  };

  assert.equal(config.routes, undefined);
});
