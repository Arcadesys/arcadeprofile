import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ZOO_COLLECTION_PATH,
  ZOO_COLLECTION_TITLE,
  ZOO_FEATURED_COLLECTION,
  ZOO_HERO,
} from './zoo-collection-meta';
import { VALID_MAGNETS, VALID_SOURCES } from './subscribe-types';

test('Zoo discovery metadata points to the canonical collection and first chapter', () => {
  assert.equal(ZOO_COLLECTION_TITLE, 'It Takes a Zoo');
  assert.equal(ZOO_FEATURED_COLLECTION.path, ZOO_COLLECTION_PATH);
  assert.equal(ZOO_FEATURED_COLLECTION.firstChapterPath, `${ZOO_COLLECTION_PATH}/cold-boot`);
  assert.equal(ZOO_FEATURED_COLLECTION.chapterCount, 7);
  assert.match(ZOO_FEATURED_COLLECTION.availability, /PDFs available by chapter/);
  assert.deepEqual(ZOO_FEATURED_COLLECTION.incentiveAction, {
    href: `${ZOO_COLLECTION_PATH}#complete-pdf`,
    label: 'Get the complete PDF',
  });
  assert.equal(ZOO_FEATURED_COLLECTION.cover, ZOO_HERO);
  assert.match(ZOO_HERO.url, /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//);
});

test('the Zoo complete-edition signup has a dedicated source and magnet', () => {
  assert.ok(VALID_SOURCES.includes('zoo-collection'));
  assert.ok(VALID_MAGNETS.includes('it-takes-a-zoo-complete'));
  const subscribeRoute = fs.readFileSync(new URL('../app/(frontend)/api/subscribe/route.ts', import.meta.url), 'utf8');
  assert.match(subscribeRoute, /it-takes-a-zoo-complete/);
  assert.match(subscribeRoute, /novels\/it-takes-a-zoo\/complete\/pdf/);
  // FooterSubscribe is a no-op stub while email signups are paused
  // site-wide; it no longer carries a per-route exemption for this path.
});

test('lightweight Zoo metadata does not load chapter prose', () => {
  const source = fs.readFileSync(new URL('./zoo-collection-meta.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /node:fs|gray-matter|content\/novels|zoo-collection['"]/);
});
