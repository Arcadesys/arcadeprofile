import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  getPostmarkBroadcastMessageStream,
  getPostmarkTransactionalMessageStream,
} from './postmark-config';

const TOUCHED_ENV = [
  'POSTMARK_BROADCAST_STREAM',
  'POSTMARK_NEWSLETTER_STREAM',
  'POSTMARK_TRANSACTIONAL_STREAM',
];

afterEach(() => {
  for (const key of TOUCHED_ENV) delete process.env[key];
});

test('broadcast stream defaults to "broadcast", not the transactional stream', () => {
  assert.equal(getPostmarkBroadcastMessageStream(), 'broadcast');
  assert.equal(getPostmarkTransactionalMessageStream(), 'outbound');
});

test('POSTMARK_NEWSLETTER_STREAM is honored as a broadcast alias', () => {
  process.env.POSTMARK_NEWSLETTER_STREAM = 'newsletter-stream';
  assert.equal(getPostmarkBroadcastMessageStream(), 'newsletter-stream');
});
