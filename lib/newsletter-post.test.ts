import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertEssayGroup,
  findPostmarkRecipientsByAttempt,
  hashAudience,
  prepareAttempt,
} from './newsletter-post';

test('essay newsletter eligibility is an exact six-group allowlist', () => {
  assert.doesNotThrow(() => assertEssayGroup('the-singularity-log'));
  assert.throws(() => assertEssayGroup('short-stories'), /not eligible/);
  assert.throws(() => assertEssayGroup('it-takes-a-zoo'), /not eligible/);
});

test('completed sends require an intentional resend reason', () => {
  const first = prepareAttempt({
    receipt: null,
    slug: 'essay',
    group: 'arcade-blog',
    productionUrl: 'https://thearcades.me/projects/arcade-blog/essay',
    audience: ['reader@example.com'],
    resend: false,
    now: new Date('2026-08-23T12:00:00Z'),
  });
  first.attempt.completedAt = '2026-08-23T12:01:00Z';
  assert.throws(() => prepareAttempt({
    receipt: first.receipt,
    slug: 'essay',
    group: 'arcade-blog',
    productionUrl: first.receipt.productionUrl,
    audience: ['reader@example.com'],
    resend: false,
  }), /already has a completed broadcast/);
  assert.throws(() => prepareAttempt({
    receipt: first.receipt,
    slug: 'essay',
    group: 'arcade-blog',
    productionUrl: first.receipt.productionUrl,
    audience: ['reader@example.com'],
    resend: true,
  }), /requires --reason/);
});

test('an existing receipt must belong to the exact essay URL', () => {
  const first = prepareAttempt({
    receipt: null,
    slug: 'essay',
    group: 'arcade-blog',
    productionUrl: 'https://thearcades.me/projects/arcade-blog/essay',
    audience: ['reader@example.com'],
    resend: false,
  });
  assert.throws(() => prepareAttempt({
    receipt: first.receipt,
    slug: 'different-essay',
    group: 'arcade-blog',
    productionUrl: 'https://thearcades.me/projects/arcade-blog/different-essay',
    audience: ['reader@example.com'],
    resend: false,
  }), /does not match this essay/);
});

test('audience hashes are order-independent and do not expose addresses', () => {
  const first = hashAudience(['B@example.com', 'a@example.com']);
  const second = hashAudience(['a@example.com', 'b@example.com']);
  assert.equal(first, second);
  assert.doesNotMatch(first, /example/);
});

test('Postmark resume search filters on attempt metadata', async () => {
  const result = await findPostmarkRecipientsByAttempt({
    attemptId: 'attempt-1',
    serverToken: 'test-token',
    fetchImpl: async () => new Response(JSON.stringify({
      TotalCount: 2,
      Messages: [
        { MessageID: 'm1', To: 'one@example.com', Metadata: { newsletter_attempt: 'attempt-1' } },
        { MessageID: 'm2', To: 'two@example.com', Metadata: { newsletter_attempt: 'other' } },
      ],
    }), { status: 200 }),
  });
  assert.deepEqual([...result.recipients], ['one@example.com']);
  assert.deepEqual(result.messageIds, ['m1']);
});
