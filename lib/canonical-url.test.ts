import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCanonicalUrl } from './canonical-url';

const SITE_URL = 'https://thearcades.me';
const FALLBACK_PATH = '/projects/example/post';
const FALLBACK_URL = `${SITE_URL}${FALLBACK_PATH}`;

test('resolveCanonicalUrl uses an absolute fallback URL when no override is set', () => {
  assert.equal(resolveCanonicalUrl(null, FALLBACK_PATH, SITE_URL), FALLBACK_URL);
  assert.equal(resolveCanonicalUrl(undefined, FALLBACK_PATH, SITE_URL), FALLBACK_URL);
  assert.equal(resolveCanonicalUrl('  ', FALLBACK_PATH, SITE_URL), FALLBACK_URL);
});

test('resolveCanonicalUrl resolves root-relative and bare paths from the site root', () => {
  assert.equal(
    resolveCanonicalUrl('/essays/canonical', FALLBACK_PATH, SITE_URL),
    'https://thearcades.me/essays/canonical',
  );
  assert.equal(
    resolveCanonicalUrl('essays/canonical', FALLBACK_PATH, `${SITE_URL}/nested/base/`),
    'https://thearcades.me/essays/canonical',
  );
});

test('resolveCanonicalUrl accepts absolute HTTP and HTTPS URLs', () => {
  assert.equal(
    resolveCanonicalUrl('https://publisher.example/story', FALLBACK_PATH, SITE_URL),
    'https://publisher.example/story',
  );
  assert.equal(
    resolveCanonicalUrl(' http://publisher.example/story ', FALLBACK_PATH, SITE_URL),
    'http://publisher.example/story',
  );
});

test('resolveCanonicalUrl removes fragments from canonical URLs', () => {
  assert.equal(
    resolveCanonicalUrl('/essays/canonical#section', FALLBACK_PATH, SITE_URL),
    'https://thearcades.me/essays/canonical',
  );
  assert.equal(
    resolveCanonicalUrl('https://publisher.example/story#section', FALLBACK_PATH, SITE_URL),
    'https://publisher.example/story',
  );
});

test('resolveCanonicalUrl rejects unsafe or malformed URL overrides', () => {
  for (const candidate of [
    'javascript:alert(1)',
    'mailto:editor@example.com',
    'ftp://publisher.example/story',
    'https://',
    '//publisher.example/story',
    String.raw`\publisher.example\story`,
  ]) {
    assert.equal(resolveCanonicalUrl(candidate, FALLBACK_PATH, SITE_URL), FALLBACK_URL);
  }
});

test('resolveCanonicalUrl rejects an invalid site URL', () => {
  assert.throws(
    () => resolveCanonicalUrl(null, FALLBACK_PATH, 'not-a-site-url'),
    /siteUrl must be an absolute HTTP\(S\) URL/,
  );
});
