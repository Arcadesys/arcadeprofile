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

test('Next exposes the public MCP proxy and the Furry History Board app at their public URLs', async () => {
  const configModule = await import('../next.config.mjs');
  const rewrites = await configModule.default.rewrites?.();

  assert.deepEqual(rewrites, [
    {
      source: '/mcp',
      destination: 'https://arcades-public-mcp.vercel.app/mcp',
    },
    {
      source: '/lab/furry-history-board/app',
      destination: '/furry-history-board/index.html',
    },
  ]);
});

test('builder work redirects to the same path on work.thearcades.me', async () => {
  const configModule = await import('../next.config.mjs');
  const redirects = (await configModule.default.redirects?.()) ?? [];
  const bySource = new Map(redirects.map((rule) => [rule.source, rule]));

  for (const source of ['/toys', '/toys/:path*', '/lab', '/lab/:slug', '/heinlein', '/heinlein/:path*', '/reaction-stickers', '/reaction-stickers/index.html']) {
    const rule = bySource.get(source);
    assert.ok(rule, `missing redirect for ${source}`);
    assert.equal(rule.destination, `https://work.thearcades.me${source}`);
    assert.equal(rule.permanent, false, 'temporary until the move settles');
  }
  assert.equal(bySource.get('/lab/:slug/pdf')?.destination, 'https://work.thearcades.me/lab/:slug');

  // The Telegram publisher and the Furry History Board app stay on this site.
  for (const kept of ['/reaction-stickers/:path*', '/lab/:slug/:path*', '/lab/furry-history-board/app']) {
    assert.ok(!bySource.has(kept), `${kept} must not redirect`);
  }
});
