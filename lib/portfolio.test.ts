import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

import { getPortfolioWork, PORTFOLIO_WORKS } from './portfolio';

test('portfolio contains the six selected works in editorial order', () => {
  assert.deepEqual(
    PORTFOLIO_WORKS.map((work) => work.title),
    [
      'Our Hope Chest',
      'Cleanup on Pod Six',
      'Mr. Trout’s Slide',
      'Gallery View',
      'Parts of the Whole',
      'La Ligne du Marais',
    ],
  );
});

test('every portfolio work has reader content and downloadable artifacts', () => {
  for (const work of PORTFOLIO_WORKS) {
    assert.equal(work.content.root.type, 'root');
    assert.ok(work.content.root.children.length > 0);
    assert.equal(getPortfolioWork(work.slug), work);
    assert.equal(work.titleImage.width, 1536);
    assert.equal(work.titleImage.height, 1024);
    assert.ok(work.titleImage.alt.includes(work.title));

    const titleImageUrl = new URL(work.titleImage.src);
    assert.equal(titleImageUrl.protocol, 'https:');
    assert.equal(
      titleImageUrl.hostname.endsWith('.public.blob.vercel-storage.com'),
      true,
    );
    assert.match(titleImageUrl.pathname, /\/[a-f0-9]{64}\//);

    for (const download of Object.values(work.downloads)) {
      const localPath = path.join(process.cwd(), 'public', download);
      assert.equal(fs.existsSync(localPath), true, `missing ${download}`);
      assert.ok(fs.statSync(localPath).size > 0, `empty ${download}`);
    }
  }
});
