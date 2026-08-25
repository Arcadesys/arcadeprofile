import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { ZOO_CHAPTERS, ZOO_HERO, zooChapterToEditorialPiece } from './zoo-collection';

test('the collection contains the six canonical chapter editions in order', () => {
  assert.deepEqual(ZOO_CHAPTERS.map(({ title, slug, order }) => ({ title, slug, order })), [
    { title: 'Cold Boot', slug: 'cold-boot', order: 1 },
    { title: 'Gallery View', slug: 'gallery-view', order: 2 },
    { title: 'Permissions', slug: 'permissions', order: 3 },
    { title: 'Goodgirl.tv', slug: 'goodgirl-tv', order: 4 },
    { title: 'Soft Reset', slug: 'soft-reset', order: 5 },
    { title: 'Open Port', slug: 'open-port', order: 6 },
  ]);
});

test('chapter Markdown is full web text without planning notes or the separate poem', () => {
  for (const chapter of ZOO_CHAPTERS) {
    assert.ok(chapter.wordCount > 1000, `${chapter.title} should contain full chapter text`);
    assert.doesNotMatch(chapter.markdown, /^# (?!#)/m);
    assert.doesNotMatch(chapter.markdown, /<!--|<claude>/i);
    assert.doesNotMatch(chapter.markdown, /It takes a Zoo to raise a child,/);
    assert.match(chapter.pdfUrl, /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//);
    assert.match(chapter.pdfSha256, /^[a-f0-9]{64}$/);
  }
  assert.match(ZOO_CHAPTERS[1].markdown, /collections\/it-takes-a-zoo\/gallery-view-artwork/);
});

test('the approved hero and PDF route contract are complete', () => {
  assert.equal(ZOO_HERO.width, 1650);
  assert.equal(ZOO_HERO.height, 2550);
  assert.match(ZOO_HERO.sha256, /^[a-f0-9]{64}$/);
  assert.match(ZOO_HERO.alt, /sheltered open-air virtual bar/i);
  const piece = zooChapterToEditorialPiece(ZOO_CHAPTERS[0]);
  assert.equal(piece.pdfOverrideUrl, ZOO_CHAPTERS[0].pdfUrl);
  assert.equal(piece.canonicalPath, '/novels/it-takes-a-zoo/cold-boot');
  assert.equal(piece.pdfPath, '/novels/it-takes-a-zoo/cold-boot/pdf');
  assert.ok(piece.blocks.length > 10);
});

test('the separate opening poem remains linked outside the six-chapter edition', () => {
  const landing = fs.readFileSync(new URL('../app/(frontend)/novels/it-takes-a-zoo/page.tsx', import.meta.url), 'utf8');
  assert.match(landing, /Read the opening poem/);
  assert.match(landing, /it-takes-a-zoo-to-raise-the-child/);
});
