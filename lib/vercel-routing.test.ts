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

test('Next exposes standalone demos at their public URLs', async () => {
  const configModule = await import('../next.config.mjs');
  const rewrites = await configModule.default.rewrites?.();

  assert.deepEqual(rewrites, [
    {
      source: '/reaction-stickers',
      destination: '/reaction-stickers/index.html',
    },
    {
      source: '/lab/furry-history-board/app',
      destination: '/furry-history-board/index.html',
    },
  ]);
});
