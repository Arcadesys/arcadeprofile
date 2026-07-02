import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  evaluatePostmarkWebhookAuth,
  safeEqual,
  tokenFromAuthorization,
} from './postmark-webhook-auth';

// ---------------------------------------------------------------------------
// tokenFromAuthorization
// ---------------------------------------------------------------------------

test('tokenFromAuthorization extracts bearer token', () => {
  assert.equal(tokenFromAuthorization('Bearer abc123'), 'abc123');
});

test('tokenFromAuthorization extracts password from basic auth', () => {
  const encoded = Buffer.from('postmark:mysecret').toString('base64');
  assert.equal(tokenFromAuthorization(`Basic ${encoded}`), 'mysecret');
});

test('tokenFromAuthorization falls back to username when password is empty', () => {
  const encoded = Buffer.from('mysecret:').toString('base64');
  assert.equal(tokenFromAuthorization(`Basic ${encoded}`), 'mysecret');
});

test('tokenFromAuthorization returns null for basic auth without a separator', () => {
  const encoded = Buffer.from('no-colon-here').toString('base64');
  assert.equal(tokenFromAuthorization(`Basic ${encoded}`), null);
});

test('tokenFromAuthorization returns null for unknown scheme', () => {
  assert.equal(tokenFromAuthorization('Digest xyz'), null);
});

test('tokenFromAuthorization returns null for null input', () => {
  assert.equal(tokenFromAuthorization(null), null);
});

// ---------------------------------------------------------------------------
// safeEqual
// ---------------------------------------------------------------------------

test('safeEqual returns true for identical secrets', () => {
  assert.ok(safeEqual('mysecret', 'mysecret'));
});

test('safeEqual returns false for different secrets', () => {
  assert.ok(!safeEqual('mysecret', 'othersecret'));
});

test('safeEqual returns false for secrets that differ only in length', () => {
  assert.ok(!safeEqual('abc', 'abcd'));
});

// ---------------------------------------------------------------------------
// evaluatePostmarkWebhookAuth
// ---------------------------------------------------------------------------

test('webhook accepts valid bearer token', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: 's3cr3t',
    authorizationHeader: 'Bearer s3cr3t',
    tokenHeader: null,
    isProduction: true,
  });
  assert.deepEqual(result, { ok: true });
});

test('webhook accepts valid basic-auth token', () => {
  const encoded = Buffer.from('postmark:s3cr3t').toString('base64');
  const result = evaluatePostmarkWebhookAuth({
    secret: 's3cr3t',
    authorizationHeader: `Basic ${encoded}`,
    tokenHeader: null,
    isProduction: true,
  });
  assert.deepEqual(result, { ok: true });
});

test('webhook accepts valid x-postmark-webhook-token header', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: 's3cr3t',
    authorizationHeader: null,
    tokenHeader: ' s3cr3t ',
    isProduction: true,
  });
  assert.deepEqual(result, { ok: true });
});

test('webhook rejects wrong secret with 403', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: 's3cr3t',
    authorizationHeader: 'Bearer wrong',
    tokenHeader: null,
    isProduction: true,
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 403);
});

test('webhook rejects missing Authorization with 403', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: 's3cr3t',
    authorizationHeader: null,
    tokenHeader: null,
    isProduction: true,
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 403);
});

test('webhook returns 500 in production when secret is unset', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: undefined,
    authorizationHeader: null,
    tokenHeader: null,
    isProduction: true,
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 500);
});

test('webhook returns 500 in production when secret is blank', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: '   ',
    authorizationHeader: null,
    tokenHeader: null,
    isProduction: true,
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 500);
});

test('webhook allows through in dev when secret is unset', () => {
  const result = evaluatePostmarkWebhookAuth({
    secret: undefined,
    authorizationHeader: null,
    tokenHeader: null,
    isProduction: false,
  });
  assert.deepEqual(result, { ok: true });
});
