import assert from 'node:assert/strict';
import test from 'node:test';

import { COLLECTION, COLLECTION_PATH, getStory, MOVED_FROM_PORTFOLIO } from './collection';

function assertContentAddressedBlobUrl(raw: string) {
  const url = new URL(raw);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname.endsWith('.public.blob.vercel-storage.com'), true);
  assert.match(url.pathname, /\/[a-f0-9]{64}\//);
}

test('the collection is seven stories in bound reading order', () => {
  assert.deepEqual(
    COLLECTION.map((story) => story.title),
    [
      'Carl',
      'Butterfly.exe',
      'Our Hope Chest',
      'Cleanup on Pod Six',
      'La Ligne du Marais',
      'Mr. Trout’s Slide',
      'Parts of the Whole',
    ],
  );
});

test('every story has cover art and a blob-hosted PDF, and no EPUB', () => {
  for (const story of COLLECTION) {
    assert.equal(getStory(story.slug), story);
    assertContentAddressedBlobUrl(story.downloads.pdf);
    assertContentAddressedBlobUrl(story.cover.src);
    assert.equal(story.cover.width, 1650);
    assert.equal(story.cover.height, 2550);
    assert.ok(story.coverAlt.length > 0);
    // EPUB and print are the paid tier; nothing here may link to one.
    assert.deepEqual(Object.keys(story.downloads), ['pdf']);
  }
});

test('Butterfly.exe has no linear reader body but does link to the toy', () => {
  const butterfly = getStory('butterfly-exe');
  assert.ok(butterfly);
  // Its EPUB flattens every branch into one file, so a generated reading
  // order would be meaningless. The playable version is the real experience.
  assert.equal(butterfly.content, undefined);
  assert.equal(butterfly.editionType, 'Interactive gamebook');
  assert.equal(butterfly.playPath, '/toys/butterfly-exe');
});

test('every other story has a reader body', () => {
  for (const story of COLLECTION.filter((s) => s.slug !== 'butterfly-exe')) {
    assert.ok(story.content, `${story.slug} is missing reader content`);
    assert.equal(story.content.root.type, 'root');
    assert.ok(story.content.root.children.length > 0);
  }
});

test('redirect list covers every story so no /portfolio URL 404s', () => {
  assert.deepEqual([...MOVED_FROM_PORTFOLIO].sort(), COLLECTION.map((s) => s.slug).sort());
  assert.equal(COLLECTION_PATH, '/this-is-what-i-do-for-fun');
});
