import { NextResponse } from 'next/server';

import type { PostmarkSendEmailResponse } from '@/lib/postmark';

const DEFAULT_TRANSACTIONAL_STREAM = 'outbound';

type EmailTestDeps = {
  authorizeCronRequest: (request: Request) => Response | null;
  sendPostmarkTestEmail: (options: { to: string }) => Promise<PostmarkSendEmailResponse>;
};

function getTransactionalStream(): string {
  return process.env.POSTMARK_TRANSACTIONAL_STREAM || DEFAULT_TRANSACTIONAL_STREAM;
}

function parseRecipient(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || !trimmedValue.includes('@')) {
    return null;
  }

  return trimmedValue;
}

async function getRecipientFromRequest(
  request: Request,
): Promise<{ to: string } | { error: string; status: number }> {
  if (request.method === 'GET') {
    const to = parseRecipient(new URL(request.url).searchParams.get('to'));
    return to
      ? { to }
      : { error: 'A valid "to" email address is required.', status: 400 };
  }

  if (request.method === 'POST') {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return { error: 'Request body must be valid JSON.', status: 400 };
    }

    const to =
      body && typeof body === 'object' && 'to' in body
        ? parseRecipient((body as { to?: unknown }).to)
        : null;

    return to
      ? { to }
      : { error: 'A valid "to" email address is required.', status: 400 };
  }

  return { error: 'Method not allowed.', status: 405 };
}

export async function handleEmailTestRequest(
  request: Request,
  deps: EmailTestDeps,
): Promise<Response> {
  const unauthorizedResponse = deps.authorizeCronRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const recipientResult = await getRecipientFromRequest(request);

  if ('error' in recipientResult) {
    return NextResponse.json({ error: recipientResult.error }, { status: recipientResult.status });
  }

  try {
    const response = await deps.sendPostmarkTestEmail({ to: recipientResult.to });
    const stream = getTransactionalStream();

    console.log(
      '[postmark-test]',
      JSON.stringify({
        to: recipientResult.to,
        messageId: response.MessageID,
        submittedAt: response.SubmittedAt,
        errorCode: response.ErrorCode,
        stream,
      }),
    );

    return NextResponse.json({
      ok: true,
      messageId: response.MessageID,
      submittedAt: response.SubmittedAt,
      stream,
    });
  } catch (error) {
    console.error('[postmark-test] Failed to send test email', error);
    return NextResponse.json(
      { error: 'Failed to send test email via Postmark.' },
      { status: 502 },
    );
  }
}
