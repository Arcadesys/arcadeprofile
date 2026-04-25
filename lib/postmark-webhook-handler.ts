import { NextResponse } from 'next/server';

type SubscriberDoc = {
  id: number | string;
  unsubscribed?: boolean | null;
};

type PayloadLike = {
  find: (args: {
    collection: 'subscribers';
    where: { email: { equals: string } };
    limit: number;
  }) => Promise<{ docs: SubscriberDoc[] }>;
  update: (args: {
    collection: 'subscribers';
    id: number | string;
    data: { unsubscribed: true; unsubscribedAt: string };
  }) => Promise<unknown>;
};

export type PostmarkWebhookEvent = {
  RecordType?: string;
  Email?: string;
  Recipient?: string;
  OriginalRecipient?: string;
  MessageID?: string;
  Type?: string;
  Description?: string;
  SuppressSending?: boolean;
};

const UNSUBSCRIBE_EVENT_TYPES = new Set(['bounce', 'spamcomplaint', 'subscriptionchange']);

function parseBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getWebhookToken(request: Request): string | null {
  const directHeader = request.headers.get('x-postmark-webhook-token');
  if (directHeader?.trim()) {
    return directHeader.trim();
  }

  return parseBearerToken(request.headers.get('authorization'));
}

function getRecipientEmail(event: PostmarkWebhookEvent): string | null {
  const value = event.Email || event.Recipient || event.OriginalRecipient;

  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}

function shouldUnsubscribe(event: PostmarkWebhookEvent): boolean {
  const type = (event.RecordType || '').trim().toLowerCase();

  if (!UNSUBSCRIBE_EVENT_TYPES.has(type)) {
    return false;
  }

  if (type === 'subscriptionchange') {
    return event.SuppressSending === true;
  }

  return true;
}

export async function handlePostmarkWebhook(
  request: Request,
  deps: { payload: PayloadLike },
): Promise<Response> {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET?.trim();

  if (secret) {
    const providedSecret = getWebhookToken(request);

    if (!providedSecret || providedSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
  }

  let event: PostmarkWebhookEvent;

  try {
    event = (await request.json()) as PostmarkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const recordType = (event.RecordType || 'unknown').trim();
  const recipient = getRecipientEmail(event);

  if (!recipient) {
    console.warn('[postmark-webhook] Missing recipient email', {
      recordType,
      messageId: event.MessageID,
    });

    return NextResponse.json({ ok: true, updatedSubscribers: 0, ignored: true });
  }

  let updatedSubscribers = 0;

  if (shouldUnsubscribe(event)) {
    const result = await deps.payload.find({
      collection: 'subscribers',
      where: {
        email: {
          equals: recipient,
        },
      },
      limit: 10,
    });

    for (const subscriber of result.docs) {
      if (subscriber.unsubscribed) {
        continue;
      }

      await deps.payload.update({
        collection: 'subscribers',
        id: subscriber.id,
        data: {
          unsubscribed: true,
          unsubscribedAt: new Date().toISOString(),
        },
      });

      updatedSubscribers += 1;
    }
  }

  console.info('[postmark-webhook]', {
    recordType,
    recipient,
    messageId: event.MessageID,
    messageType: event.Type,
    description: event.Description,
    updatedSubscribers,
  });

  return NextResponse.json({
    ok: true,
    updatedSubscribers,
    recordType,
  });
}
