import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PREVIEW_TOKEN_LENGTH,
  PREVIEW_TOKEN_PATTERN,
  buildPreviewUrl,
  generatePreviewToken,
  isPreviewToken,
} from './preview-token';

test('generatePreviewToken produces 8 base62 characters', () => {
  for (let i = 0; i < 1000; i++) {
    const token = generatePreviewToken();
    assert.equal(token.length, PREVIEW_TOKEN_LENGTH);
    assert.match(token, PREVIEW_TOKEN_PATTERN);
  }
});

test('generatePreviewToken has near-zero collision rate over 100k samples', () => {
  const seen = new Set<string>();
  const N = 100_000;
  for (let i = 0; i < N; i++) seen.add(generatePreviewToken());
  // 100k tokens out of 218 trillion: expected collisions ≈ 0.023. Demand all unique.
  assert.equal(seen.size, N, `expected ${N} unique tokens, got ${seen.size}`);
});

test('isPreviewToken accepts valid tokens and rejects junk', () => {
  assert.ok(isPreviewToken(generatePreviewToken()));
  assert.ok(isPreviewToken('Aa0Bb1Cc'));
  assert.ok(!isPreviewToken(''));
  assert.ok(!isPreviewToken('abc'));
  assert.ok(!isPreviewToken('abcdefghi'));
  assert.ok(!isPreviewToken('abcdef-g'));
  assert.ok(!isPreviewToken('abcdef g'));
  assert.ok(!isPreviewToken(null));
  assert.ok(!isPreviewToken(undefined));
  assert.ok(!isPreviewToken(12345678));
});

test('buildPreviewUrl composes site URL and strips trailing slashes', () => {
  assert.equal(buildPreviewUrl('Aa0Bb1Cc', 'https://example.com'), 'https://example.com/preview/Aa0Bb1Cc');
  assert.equal(buildPreviewUrl('Aa0Bb1Cc', 'https://example.com/'), 'https://example.com/preview/Aa0Bb1Cc');
  assert.equal(buildPreviewUrl('Aa0Bb1Cc', 'https://example.com///'), 'https://example.com/preview/Aa0Bb1Cc');
  assert.equal(buildPreviewUrl('invalid', 'https://example.com'), null);
  assert.equal(buildPreviewUrl(null, 'https://example.com'), null);
  assert.equal(buildPreviewUrl(undefined, 'https://example.com'), null);
});
