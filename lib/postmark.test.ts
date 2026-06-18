import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { Models } from 'postmark';

import { LinkTrackingOptions, PostmarkBatchSendError, sendPostmarkNewsletterEmail } from './postmark';

afterEach(() => {
  delete process.env.POSTMARK_FROM_EMAIL;
  delete process.env.POSTMARK_FROM_NAME;
  delete process.env.POSTMARK_BROADCAST_STREAM;
  delete process.env.POSTMARK_NEWSLETTER_STREAM;
});

test('sendPostmarkNewsletterEmail batches recipients and records message ids', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';
  process.env.POSTMARK_FROM_NAME = 'The Arcades';
  process.env.POSTMARK_BROADCAST_STREAM = 'broadcast';
  const batches: Models.Message[][] = [];

  const result = await sendPostmarkNewsletterEmail({
    to: ['A@example.com', 'b@example.com', 'a@example.com'],
    subject: 'New post',
    htmlBody: '<p>Hello</p>',
    textBody: 'Hello',
    tag: 'post-newsletter',
    metadata: { postId: '123', postSlug: 'new-post' },
    trackOpens: false,
    trackLinks: LinkTrackingOptions.None,
    batchSize: 1,
    client: {
      async sendEmailBatch(messages) {
        batches.push(messages);
        return messages.map((message, index) => ({
          To: message.To,
          ErrorCode: 0,
          Message: 'OK',
          MessageID: `${message.To ?? 'unknown'}-${index}`,
          SubmittedAt: '2026-06-06T12:00:00.000Z',
        }));
      },
    },
  });

  assert.equal(result.recipientCount, 2);
  assert.deepEqual(result.messageIds, ['a@example.com-0', 'b@example.com-0']);
  assert.deepEqual(result.accepted.map((message) => message.to), ['a@example.com', 'b@example.com']);
  assert.equal(batches.length, 2);
  assert.equal(batches[0][0].MessageStream, 'broadcast');
  assert.equal(batches[0][0].Subject, 'New post');
  assert.equal(batches[0][0].Tag, 'post-newsletter');
  assert.deepEqual(batches[0][0].Metadata, { postId: '123', postSlug: 'new-post' });
  assert.equal(batches[0][0].TrackOpens, false);
  assert.equal(batches[0][0].TrackLinks, 'None');
});

test('sendPostmarkNewsletterEmail throws with accepted and failed recipients', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';

  await assert.rejects(
    () => sendPostmarkNewsletterEmail({
      to: ['a@example.com', 'b@example.com'],
      subject: 'New post',
      htmlBody: '<p>Hello</p>',
      textBody: 'Hello',
      client: {
        async sendEmailBatch(messages) {
          return [
            {
              To: 'a@example.com',
              ErrorCode: 0,
              Message: 'OK',
              MessageID: 'pm-1',
              SubmittedAt: '2026-06-06T12:00:00.000Z',
            },
            {
              To: messages[1].To,
              ErrorCode: 406,
              Message: 'Inactive recipient',
              MessageID: '',
              SubmittedAt: '2026-06-06T12:00:00.000Z',
            },
          ];
        },
      },
    }),
    (err) => {
      assert.ok(err instanceof PostmarkBatchSendError);
      assert.equal(err.recipientCount, 2);
      assert.deepEqual(err.accepted, [
        {
          to: 'a@example.com',
          messageId: 'pm-1',
          submittedAt: '2026-06-06T12:00:00.000Z',
          message: 'OK',
        },
      ]);
      assert.deepEqual(err.failures, [
        {
          to: 'b@example.com',
          errorCode: 406,
          message: 'Inactive recipient',
          submittedAt: '2026-06-06T12:00:00.000Z',
        },
      ]);
      return true;
    },
  );
});
