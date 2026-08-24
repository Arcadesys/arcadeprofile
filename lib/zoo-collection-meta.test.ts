import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ZOO_COLLECTION_PATH,
  ZOO_COLLECTION_TITLE,
  ZOO_FEATURED_COLLECTION,
  ZOO_HERO,
} from './zoo-collection-meta';

test('Zoo discovery metadata points to the canonical collection and first chapter', () => {
  assert.equal(ZOO_COLLECTION_TITLE, 'It Takes a Zoo');
  assert.equal(ZOO_FEATURED_COLLECTION.path, ZOO_COLLECTION_PATH);
  assert.equal(ZOO_FEATURED_COLLECTION.firstChapterPath, `${ZOO_COLLECTION_PATH}/cold-boot`);
  assert.equal(ZOO_FEATURED_COLLECTION.chapterCount, 6);
  assert.match(ZOO_FEATURED_COLLECTION.availability, /PDFs available by chapter/);
  assert.equal(ZOO_FEATURED_COLLECTION.cover, ZOO_HERO);
  assert.match(ZOO_HERO.url, /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//);
});

test('lightweight Zoo metadata does not load chapter prose', () => {
  const source = fs.readFileSync(new URL('./zoo-collection-meta.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /node:fs|gray-matter|content\/novels|zoo-collection['"]/);
});
