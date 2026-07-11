import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { Models } from 'postmark';

import {
  LinkTrackingOptions,
  PostmarkBatchSendError,
  type PostmarkSendEmailResponse,
  sendPostmarkNewsletterEmail,
  sendPostmarkTransactionalEmail,
} from './postmark';

afterEach(() => {
  delete process.env.POSTMARK_FROM_EMAIL;
  delete process.env.POSTMARK_FROM_NAME;
  delete process.env.POSTMARK_TRANSACTIONAL_STREAM;
  delete process.env.POSTMARK_BROADCAST_STREAM;
  delete process.env.POSTMARK_NEWSLETTER_STREAM;
});

test('sendPostmarkTransactionalEmail uses formatted sender and transactional stream', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';
  process.env.POSTMARK_FROM_NAME = 'The Arcades';
  process.env.POSTMARK_TRANSACTIONAL_STREAM = 'transactional';
  const sentMessages: Models.Message[] = [];

  const response = await sendPostmarkTransactionalEmail({
    to: 'reader@example.com',
    subject: 'Preview',
    htmlBody: '<p>Hello</p>',
    textBody: 'Hello',
    client: {
      async sendEmail(message) {
        sentMessages.push(message);
        return {
          ErrorCode: 0,
          Message: 'OK',
          MessageID: 'pm-transactional',
          SubmittedAt: '2026-06-06T12:00:00.000Z',
          To: message.To,
        } as PostmarkSendEmailResponse;
      },
    },
  });

  assert.equal(response.MessageID, 'pm-transactional');
  const sentMessage = sentMessages[0];
  assert.ok(sentMessage);
  assert.equal(sentMessage?.From, 'The Arcades <news@example.com>');
  assert.equal(sentMessage?.MessageStream, 'transactional');
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

test('sendPostmarkNewsletterEmail reports acceptances per batch via onBatchAccepted', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';
  const reported: string[][] = [];

  await sendPostmarkNewsletterEmail({
    to: ['a@example.com', 'b@example.com', 'c@example.com'],
    subject: 'New post',
    htmlBody: '<p>Hello</p>',
    textBody: 'Hello',
    batchSize: 2,
    onBatchAccepted(accepted) {
      reported.push(accepted.map((message) => message.to));
    },
    client: {
      async sendEmailBatch(messages) {
        return messages.map((message, index) => ({
          To: message.To,
          ErrorCode: 0,
          Message: 'OK',
          MessageID: `pm-${message.To ?? index}`,
          SubmittedAt: '2026-06-06T12:00:00.000Z',
        }));
      },
    },
  });

  // Two batches (2 + 1) → callback fires once per batch, in order.
  assert.deepEqual(reported, [['a@example.com', 'b@example.com'], ['c@example.com']]);
});

test('sendPostmarkNewsletterEmail reports accepted messages via onBatchAccepted even when the send throws', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';
  const reported: string[][] = [];

  await assert.rejects(
    () => sendPostmarkNewsletterEmail({
      to: ['ok@example.com', 'rejected@example.com'],
      subject: 'New post',
      htmlBody: '<p>Hello</p>',
      textBody: 'Hello',
      onBatchAccepted(accepted) {
        reported.push(accepted.map((message) => message.to));
      },
      client: {
        async sendEmailBatch() {
          return [
            {
              To: 'ok@example.com',
              ErrorCode: 0,
              Message: 'OK',
              MessageID: 'pm-ok',
              SubmittedAt: '2026-06-06T12:00:00.000Z',
            },
            {
              To: 'rejected@example.com',
              ErrorCode: 406,
              Message: 'Inactive recipient',
              MessageID: '',
              SubmittedAt: '2026-06-06T12:00:00.000Z',
            },
          ];
        },
      },
    }),
    PostmarkBatchSendError,
  );

  // The accepted half of the mixed batch was still reported before the throw.
  assert.deepEqual(reported, [['ok@example.com']]);
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

test('sendPostmarkNewsletterEmail fails recipients missing from the batch response', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';

  await assert.rejects(
    () => sendPostmarkNewsletterEmail({
      to: ['a@example.com', 'b@example.com'],
      subject: 'New post',
      htmlBody: '<p>Hello</p>',
      textBody: 'Hello',
      client: {
        async sendEmailBatch() {
          return [
            {
              To: 'a@example.com',
              ErrorCode: 0,
              Message: 'OK',
              MessageID: 'pm-1',
              SubmittedAt: '2026-06-06T12:00:00.000Z',
            },
          ];
        },
      },
    }),
    (err) => {
      assert.ok(err instanceof PostmarkBatchSendError);
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
          errorCode: -1,
          message: 'Postmark did not return a response for this recipient',
          submittedAt: null,
        },
      ]);
      return true;
    },
  );
});

test('sendPostmarkNewsletterEmail rejects invalid batch sizes before sending', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';

  for (const batchSize of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(
      () => sendPostmarkNewsletterEmail({
        to: ['a@example.com'],
        subject: 'New post',
        htmlBody: '<p>Hello</p>',
        textBody: 'Hello',
        batchSize,
        client: {
          async sendEmailBatch() {
            throw new Error('sendEmailBatch should not be called');
          },
        },
      }),
      /batchSize must be a positive integer/,
    );
  }
});
