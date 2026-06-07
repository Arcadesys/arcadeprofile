import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { Models } from 'postmark';

import { sendPostmarkNewsletterEmail } from './postmark';

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
  assert.equal(batches.length, 2);
  assert.equal(batches[0][0].MessageStream, 'broadcast');
  assert.equal(batches[0][0].Subject, 'New post');
});

test('sendPostmarkNewsletterEmail throws when a batch response fails', async () => {
  process.env.POSTMARK_FROM_EMAIL = 'news@example.com';

  await assert.rejects(
    () =>
      sendPostmarkNewsletterEmail({
        to: ['a@example.com'],
        subject: 'New post',
        htmlBody: '<p>Hello</p>',
        textBody: 'Hello',
        client: {
          async sendEmailBatch() {
            return [
              {
                To: 'a@example.com',
                ErrorCode: 406,
                Message: 'Inactive recipient',
                MessageID: '',
                SubmittedAt: '2026-06-06T12:00:00.000Z',
              },
            ];
          },
        },
      }),
    /Postmark batch send failed/,
  );
});
