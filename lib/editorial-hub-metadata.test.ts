import assert from 'node:assert/strict';
import test from 'node:test';

import { editorialHubMetadata, ESSAYS_HUB, STORIES_HUB } from './editorial-hub-metadata';
import { SITE_NAME } from './site-brand';

test('reading hubs have distinct descriptive titles and self-canonicals', () => {
  const stories = editorialHubMetadata(STORIES_HUB);
  const essays = editorialHubMetadata(ESSAYS_HUB);

  assert.equal(stories.title, 'Free Queer & Furry Speculative Fiction');
  assert.equal(essays.title, 'Essays on Queer & Trans Life, AI, Creativity & Accessibility');
  assert.notEqual(stories.description, essays.description);
  assert.equal(stories.alternates?.canonical, '/stories');
  assert.equal(essays.alternates?.canonical, '/essays');
  assert.equal(stories.openGraph?.url, '/stories');
  assert.equal(essays.openGraph?.url, '/essays');
});

test('hub titles name the brand once: the layout template adds it to <title>, social titles carry it', () => {
  for (const hub of [STORIES_HUB, ESSAYS_HUB]) {
    const metadata = editorialHubMetadata(hub);
    assert(!String(metadata.title).includes(SITE_NAME));
    assert.equal(metadata.openGraph?.title, `${hub.title} | ${SITE_NAME}`);
    assert(metadata.twitter && 'card' in metadata.twitter);
    assert.equal(metadata.twitter.title, `${hub.title} | ${SITE_NAME}`);
    assert.equal(metadata.twitter.card, 'summary_large_image');
  }
});
