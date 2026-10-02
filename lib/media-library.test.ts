import assert from 'node:assert/strict';
import test from 'node:test';

import { markdownToSafeHtml } from './markdown-render';
import {
  BLOB_STORE_HOSTNAME,
  loadMediaLibrary,
  mediaIdFromFilename,
  mediaMarkdown,
  parseMediaLibrary,
  upsertMediaAsset,
  type MediaAsset,
} from './media-library';

const sha = 'a'.repeat(64);
const asset: MediaAsset = {
  id: 'moxie-bowling',
  url: `https://${BLOB_STORE_HOSTNAME}/images/${sha}/moxie-bowling.png`,
  sha256: sha,
  mimeType: 'image/png',
  byteSize: 10,
  alt: 'Moxie [bowling]',
  caption: 'Moxie in the "bowling" scene (first pass)',
  addedAt: '2026-10-02T00:00:00.000Z',
};

test('committed media library is valid', () => {
  const library = loadMediaLibrary();
  assert.ok(library.assets.length > 0);
});

test('rejects foreign hosts, mismatched content addresses, and duplicate ids', () => {
  assert.throws(() => parseMediaLibrary({ assets: [{ ...asset, url: 'https://example.test/x.png' }] }), /must be on/);
  assert.throws(
    () => parseMediaLibrary({ assets: [{ ...asset, url: `https://${BLOB_STORE_HOSTNAME}/images/${'b'.repeat(64)}/x.png` }] }),
    /must match sha256/,
  );
  const other = { ...asset, url: `https://${BLOB_STORE_HOSTNAME}/other.png` };
  assert.throws(() => parseMediaLibrary({ assets: [asset, other] }), /Duplicate media id/);
});

test('upsert replaces by url and refuses id collisions', () => {
  const once = upsertMediaAsset({ assets: [] }, asset);
  const twice = upsertMediaAsset(once, { ...asset, alt: 'Updated' });
  assert.equal(twice.assets.length, 1);
  assert.equal(twice.assets[0]?.alt, 'Updated');
  assert.throws(() => upsertMediaAsset(once, { ...asset, url: `https://${BLOB_STORE_HOSTNAME}/other.png` }), /already names/);
});

test('snippet renders as a captioned figure', () => {
  const html = markdownToSafeHtml(mediaMarkdown(asset));
  assert.match(html, /^<figure><img src="[^"]+moxie-bowling\.png" alt="Moxie bowling"[^>]*\/><figcaption>Moxie in the [^<]*bowling[^<]* scene \(first pass\)<\/figcaption><\/figure>$/);
  assert.equal(mediaIdFromFilename('/images/x/01-Pine_Jack Split.gif'), '01-pine-jack-split');
});
