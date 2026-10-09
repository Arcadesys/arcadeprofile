import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import release from '@/data/toys/message-in-a-bottle-release.json';

test('the hosted module keeps every local reference and GM jump usable', () => {
  const directory = path.join(process.cwd(), 'public/toys/message-in-a-bottle');
  const document = new JSDOM(readFileSync(path.join(directory, 'guide.html'), 'utf8')).window.document;
  for (const element of document.querySelectorAll('[href], [src]')) {
    const reference = element.getAttribute('href') ?? element.getAttribute('src')!;
    if (reference.startsWith('#')) {
      assert.ok(document.getElementById(reference.slice(1)), `missing jump: ${reference}`);
    } else if (!/^(https?:|\/)/.test(reference)) {
      assert.ok(existsSync(path.join(directory, reference)), `missing file: ${reference}`);
    }
    assert.ok(!reference.includes('message-in-a-bottle-alpha.vercel.app'));
  }
  assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), `https://www.thearcades.me${release.guidePath}`);
  assert.ok(document.querySelector('a[href="' + release.download.url + '"]'));
  assert.ok(document.querySelector('a[href="https://github.com/Arcadesys/message-in-a-bottle/blob/main/mcp/README.md"]'));
  assert.ok(document.body.textContent?.includes('Pinnacle makes no representation or warranty'));
});
