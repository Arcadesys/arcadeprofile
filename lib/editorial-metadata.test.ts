import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEditorialMetadata } from './editorial-metadata';

test('editorial metadata uses one canonical web URL and treats PDFs as an encoding', () => {
  const result = buildEditorialMetadata({
    title: 'The Signal',
    description: 'A test editorial piece.',
    path: '/stories/the-signal',
    image: '/og/the-signal.png',
    section: 'Fiction',
    collection: { name: 'Stories', path: '/stories' },
    pdfPath: '/stories/the-signal/pdf',
  });

  assert.equal(result.canonicalUrl, 'https://www.thearcades.me/stories/the-signal');
  assert.equal(result.metadata.alternates?.canonical, result.canonicalUrl);
  assert.equal((result.metadata.openGraph as { url?: string }).url, result.canonicalUrl);
  assert.equal((result.metadata.openGraph as { title?: string }).title, "The Signal | The Arcades' Lab");
  assert.equal(result.articleJsonLd.url, result.canonicalUrl);
  assert.deepEqual(result.articleJsonLd.encoding, {
    '@type': 'MediaObject',
    contentUrl: 'https://www.thearcades.me/stories/the-signal/pdf',
    encodingFormat: 'application/pdf',
  });
  assert.equal(result.breadcrumbJsonLd['@type'], 'BreadcrumbList');
});

test('editorial metadata supplies the site card when a piece has no artwork', () => {
  const result = buildEditorialMetadata({
    title: 'Unillustrated Note',
    description: 'A test piece without artwork.',
    path: '/lab/unillustrated-note',
  });

  assert.deepEqual((result.metadata.openGraph as { images?: unknown }).images, [{
    url: 'https://www.thearcades.me/opengraph-image',
    alt: "THE ARCADES' LAB — Austen Tucker",
  }]);
  assert.deepEqual((result.metadata.twitter as { images?: unknown }).images, ['https://www.thearcades.me/opengraph-image']);
  assert.equal(result.articleJsonLd.image, 'https://www.thearcades.me/opengraph-image');
});
