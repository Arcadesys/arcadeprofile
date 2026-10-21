import { NextResponse } from 'next/server';
import { parseResendUnsubscribeToken } from '@/lib/writing-signup';
import { unsubscribeResendContact } from '@/lib/resend-contacts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' };
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers });

/** GET is intentionally absent: mail scanners must not unsubscribe readers. */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  let token: string | null = null;
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json() as { token?: unknown };
      if (typeof body.token === 'string') token = body.token;
    } catch { /* handled as invalid */ }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = new URLSearchParams(await request.text());
    if (body.get('List-Unsubscribe') === 'One-Click') token = url.searchParams.get('token');
  }
  if (!token) return reply({ error: 'This unsubscribe link is invalid.' }, 400);
  let identity: ReturnType<typeof parseResendUnsubscribeToken>;
  try { identity = parseResendUnsubscribeToken(token); } catch { identity = null; }
  if (!identity) return reply({ error: 'This unsubscribe link is invalid.' }, 400);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return reply({ error: 'Unsubscribe is temporarily unavailable. Please retry.' }, 503);

  try {
    await unsubscribeResendContact(identity.subscriberId, apiKey);
    return reply({ ok: true });
  } catch {
    // Do not log tokens, subscriber IDs, or provider response bodies.
    return reply({ error: 'Unsubscribe could not be completed. Please retry.' }, 502);
  }
}
