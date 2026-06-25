import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  assertNewsletterConfigValid,
  getPostmarkBroadcastMessageStream,
  getPostmarkTransactionalMessageStream,
  NewsletterConfigError,
} from './postmark-config';

const TOUCHED_ENV = [
  'POSTMARK_BROADCAST_STREAM',
  'POSTMARK_NEWSLETTER_STREAM',
  'POSTMARK_TRANSACTIONAL_STREAM',
  'POSTMARK_REQUIRED_IN_PROD',
  'POSTMARK_SERVER_TOKEN',
  'POSTMARK_FROM_EMAIL',
  'AC_API_URL',
  'AC_API_KEY',
  'AC_LIST_ID_ALL_PERPOST',
  'AC_LIST_ID_FICTION_PERPOST',
  'AC_LIST_ID_ESSAYS_PERPOST',
];

afterEach(() => {
  for (const key of TOUCHED_ENV) delete process.env[key];
});

function setValidConfig() {
  process.env.POSTMARK_SERVER_TOKEN = 'token';
  process.env.POSTMARK_FROM_EMAIL = 'hello@example.com';
  process.env.AC_API_URL = 'https://example.api-us1.com';
  process.env.AC_API_KEY = 'ac-key';
  process.env.AC_LIST_ID_ALL_PERPOST = '13';
  process.env.AC_LIST_ID_FICTION_PERPOST = '11';
  process.env.AC_LIST_ID_ESSAYS_PERPOST = '12';
}

test('broadcast stream defaults to "broadcast", not the transactional stream', () => {
  assert.equal(getPostmarkBroadcastMessageStream(), 'broadcast');
  assert.equal(getPostmarkTransactionalMessageStream(), 'outbound');
});

test('POSTMARK_NEWSLETTER_STREAM is honored as a broadcast alias', () => {
  process.env.POSTMARK_NEWSLETTER_STREAM = 'newsletter-stream';
  assert.equal(getPostmarkBroadcastMessageStream(), 'newsletter-stream');
});

test('assertNewsletterConfigValid is a no-op when not enforced', () => {
  // Neither production nor POSTMARK_REQUIRED_IN_PROD → no throw even if unset.
  assert.doesNotThrow(() => assertNewsletterConfigValid());
});

test('assertNewsletterConfigValid throws on missing env when enforced', () => {
  process.env.POSTMARK_REQUIRED_IN_PROD = 'true';
  assert.throws(() => assertNewsletterConfigValid(), (err: unknown) => {
    assert.ok(err instanceof NewsletterConfigError);
    assert.match((err as Error).message, /missing env/i);
    return true;
  });
});

test('assertNewsletterConfigValid throws when broadcast equals transactional', () => {
  process.env.POSTMARK_REQUIRED_IN_PROD = 'true';
  setValidConfig();
  process.env.POSTMARK_BROADCAST_STREAM = 'outbound';
  process.env.POSTMARK_TRANSACTIONAL_STREAM = 'outbound';
  assert.throws(() => assertNewsletterConfigValid(), (err: unknown) => {
    assert.ok(err instanceof NewsletterConfigError);
    assert.match((err as Error).message, /must differ from the transactional stream/i);
    return true;
  });
});

test('assertNewsletterConfigValid passes with a complete, valid config', () => {
  process.env.POSTMARK_REQUIRED_IN_PROD = 'true';
  setValidConfig();
  process.env.POSTMARK_BROADCAST_STREAM = 'broadcast';
  assert.doesNotThrow(() => assertNewsletterConfigValid());
});
