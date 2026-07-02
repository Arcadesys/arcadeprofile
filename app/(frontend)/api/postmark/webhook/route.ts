import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { logger } from '@/lib/logger';
import { handlePostmarkWebhook, PostmarkWebhookValidationError } from '@/lib/postmark-events';
import { evaluatePostmarkWebhookAuth } from '@/lib/postmark-webhook-auth';

function authorizePostmarkWebhook(request: Request): NextResponse | null {
  const result = evaluatePostmarkWebhookAuth({
    secret: process.env.POSTMARK_WEBHOOK_SECRET,
    authorizationHeader: request.headers.get('authorization'),
    tokenHeader: request.headers.get('x-postmark-webhook-token'),
    isProduction: process.env.NODE_ENV === 'production',
  });
  if (result.ok) return null;
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function POST(request: Request) {
  const unauthorized = authorizePostmarkWebhook(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const result = await handlePostmarkWebhook(payload, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // Malformed payload — return 400 so Postmark doesn't retry an unprocessable
    // event. Genuine server faults still return 500 (and get retried).
    if (err instanceof PostmarkWebhookValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logger.error({ err }, '[postmark-webhook] failed to process event');
    return NextResponse.json({ error: 'Failed to process Postmark webhook.' }, { status: 500 });
  }
}
