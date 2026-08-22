import assert from 'node:assert/strict';
import test from 'node:test';

import { buildToyMetadata } from './metadata';

test('buildToyMetadata aligns canonical, Open Graph, and Twitter values', () => {
  const metadata = buildToyMetadata({
    title: 'Test Toy',
    description: 'A testable interactive story.',
    path: '/toys/test-toy',
    image: {
      src: 'https://example.test/toy.png',
      alt: 'Test Toy cover',
      width: 1200,
      height: 630,
    },
  });

  assert.deepEqual(metadata, {
    title: 'Test Toy',
    description: 'A testable interactive story.',
    alternates: {
      canonical: '/toys/test-toy',
    },
    openGraph: {
      type: 'website',
      title: "Test Toy | The Arcades' Lab",
      description: 'A testable interactive story.',
      url: '/toys/test-toy',
      images: [{
        url: 'https://example.test/toy.png',
        width: 1200,
        height: 630,
        alt: 'Test Toy cover',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: "Test Toy | The Arcades' Lab",
      description: 'A testable interactive story.',
      images: [{
        url: 'https://example.test/toy.png',
        width: 1200,
        height: 630,
        alt: 'Test Toy cover',
      }],
    },
  });
});

test('buildToyMetadata uses the site card when no toy image exists', () => {
  const metadata = buildToyMetadata({
    title: 'Toys',
    description: 'Interactive work by Austen Tucker.',
    path: '/toys',
  });

  const expectedImage = {
    url: '/opengraph-image',
    width: 1200,
    height: 630,
    alt: "THE ARCADES' LAB — Austen Tucker",
  };

  assert.deepEqual(metadata.openGraph?.images, [expectedImage]);
  assert.deepEqual(metadata.twitter?.images, [expectedImage]);
});
