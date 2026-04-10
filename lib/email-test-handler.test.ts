import assert from 'node:assert/strict';
import test from 'node:test';

import { handleEmailTestRequest } from './email-test-handler';
import type { PostmarkSendEmailResponse } from './postmark';

function createPostmarkResponse(
  overrides: Partial<PostmarkSendEmailResponse> = {},
): PostmarkSendEmailResponse {
  return {
    ErrorCode: 0,
    Message: 'OK',
    MessageID: 'test-message-id',
    SubmittedAt: '2026-04-10T12:00:00.000Z',
    To: 'you@example.com',
    ...overrides,
  };
}

test('handleEmailTestRequest returns auth response unchanged', async () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized.' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

  const response = await handleEmailTestRequest(
    new Request('https://example.com/api/email/test?to=you@example.com'),
    {
      authorizeCronRequest: () => unauthorizedResponse,
      sendPostmarkTestEmail: async () => {
        throw new Error('sendPostmarkTestEmail should not be called');
      },
    },
  );

  assert.equal(response, unauthorizedResponse);
});

test('handleEmailTestRequest rejects requests without a valid recipient', async () => {
  const response = await handleEmailTestRequest(
    new Request('https://example.com/api/email/test'),
    {
      authorizeCronRequest: () => null,
      sendPostmarkTestEmail: async () => {
        throw new Error('sendPostmarkTestEmail should not be called');
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'A valid "to" email address is required.',
  });
});

test('handleEmailTestRequest returns message details when Postmark accepts the email', async () => {
  const sentEmails: string[] = [];

  const response = await handleEmailTestRequest(
    new Request('https://example.com/api/email/test', {
      method: 'POST',
      body: JSON.stringify({ to: 'you@example.com' }),
      headers: { 'content-type': 'application/json' },
    }),
    {
      authorizeCronRequest: () => null,
      sendPostmarkTestEmail: async ({ to }) => {
        sentEmails.push(to);
        return createPostmarkResponse();
      },
    },
  );

  assert.deepEqual(sentEmails, ['you@example.com']);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    messageId: 'test-message-id',
    submittedAt: '2026-04-10T12:00:00.000Z',
    stream: 'outbound',
  });
});

test('handleEmailTestRequest hides internal Postmark errors from the response body', async () => {
  const response = await handleEmailTestRequest(
    new Request('https://example.com/api/email/test?to=you@example.com'),
    {
      authorizeCronRequest: () => null,
      sendPostmarkTestEmail: async () => {
        throw new Error('Missing POSTMARK_SERVER_TOKEN environment variable');
      },
    },
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: 'Failed to send test email via Postmark.',
  });
});
