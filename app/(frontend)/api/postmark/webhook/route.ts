import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { logger } from '@/lib/logger';
import { handlePostmarkWebhook, PostmarkWebhookValidationError } from '@/lib/postmark-events';

// Hash both sides to a fixed 32-byte length before comparing, so a length
// mismatch can't short-circuit and leak the secret's length via timing.
function safeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

function tokenFromAuthorization(header: string | null): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(/\s+/, 2);
  if (!scheme || !value) return null;

  if (scheme.toLowerCase() === 'bearer') return value.trim() || null;

  if (scheme.toLowerCase() === 'basic') {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator < 0) return null;
      const username = decoded.slice(0, separator);
      const password = decoded.slice(separator + 1);
      return password || username || null;
    } catch {
      return null;
    }
  }

  return null;
}

function authorizePostmarkWebhook(request: Request): NextResponse | null {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'POSTMARK_WEBHOOK_SECRET is not configured.' },
        { status: 500 },
      );
    }
    return null;
  }

  const token =
    tokenFromAuthorization(request.headers.get('authorization')) ??
    request.headers.get('x-postmark-webhook-token')?.trim() ??
    null;
  if (!token || !safeEqual(token, secret)) {
    // Postmark stops webhook retries on 403, which is what we want for bad auth.
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
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
