import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_ORIGIN, isProductionAnalyticsEnvironment } from '@/lib/site-analytics';
import { sanitizeAnalyticsPayload, type AnalyticsSurface } from '@/lib/analytics-payload';
import { analyticsDeviceType } from '@/lib/analytics-device';
import { createReceiptCache } from '@/lib/analytics-receipts';
import { createHash } from 'node:crypto';

const POSTHOG_TOKEN = process.env.POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? 'phc_wH8qGy3tzYkfwDCLe9rZuBPxP7kaXWVocAnj6vVJFnaa';
const POSTHOG_HOST = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const receipts = createReceiptCache<{ ok: boolean; error?: string }>();

export async function receiveAnalytics(request: NextRequest, surface: AnalyticsSurface) {
  // Use the request URL/deployment context, never a submitted or forwarded host.
  // A no-op 204 keeps local/preview clients nonblocking without sending a receipt.
  if (!isProductionAnalyticsEnvironment(process.env.NODE_ENV, process.env.VERCEL_ENV) || new URL(request.url).origin !== ANALYTICS_ORIGIN) return new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  if (origin && origin !== ANALYTICS_ORIGIN) return NextResponse.json({ ok: false, error: 'invalid_origin' }, { status: 403 });
  if (request.headers.get('dnt') === '1') return new NextResponse(null, { status: 204 });
  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const payload = sanitizeAnalyticsPayload(input, surface);
  if (!payload) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
  const forward = async () => { try {
    const response = await fetch(`${POSTHOG_HOST}${surface === 'sitewide' ? '/capture/' : '/i/v0/e/'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        api_key: POSTHOG_TOKEN, ...payload,
        properties: {
          ...payload.properties,
          $process_person_profile: false,
          // Preserve existing device/geo policy. No client-supplied raw fields.
          ...(surface === 'sitewide' ? { $geoip_disable: false } : {}),
          $raw_user_agent: request.headers.get('user-agent') ?? undefined,
          ...(surface === 'sitewide' ? { $device_type: analyticsDeviceType(request.headers.get('user-agent')) } : {}),
        },
      }),
    });
    if (!response.ok) {
      console.error('[site-analytics] posthog rejected event', payload.event, response.status);
      return { ok: false, error: 'upstream_rejected' };
    }
  } catch {
    console.error('[site-analytics] posthog request failed', payload.event);
    return { ok: false, error: 'upstream_failed' };
  }
  return { ok: true }; };
  const result = payload.uuid
    ? await receipts(`${surface}:${payload.uuid}`, createHash('sha256').update(JSON.stringify(payload)).digest('hex'), forward, response => response.ok)
    : await forward();
  if (!result) return NextResponse.json({ ok: false, error: 'receipt_conflict' }, { status: 400 });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
