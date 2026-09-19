import { NextRequest, NextResponse } from 'next/server';

const POSTHOG_TOKEN =
  process.env.POSTHOG_PROJECT_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
  'phc_wH8qGy3tzYkfwDCLe9rZuBPxP7kaXWVocAnj6vVJFnaa';
const POSTHOG_HOST =
  process.env.POSTHOG_HOST ??
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  'https://us.i.posthog.com';

const ALLOWED_EVENTS = new Set([
  '$pageview',
  'mff page viewed',
  'mff scroll reached',
  'mff section viewed',
  'mff exhibit viewed',
  'mff link clicked',
  'mff sources opened',
]);

type AnalyticsPayload = {
  event?: unknown;
  distinct_id?: unknown;
  properties?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: AnalyticsPayload;

  try {
    payload = (await request.json()) as AnalyticsPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (
    typeof payload.event !== 'string' ||
    !ALLOWED_EVENTS.has(payload.event) ||
    typeof payload.distinct_id !== 'string' ||
    !payload.distinct_id ||
    typeof payload.properties !== 'object' ||
    payload.properties === null ||
    Array.isArray(payload.properties)
  ) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
  }

  const properties = payload.properties as Record<string, unknown>;
  const currentUrl =
    typeof properties.$current_url === 'string'
      ? properties.$current_url
      : new URL('/mff', request.url).toString();

  let current: URL;
  try {
    current = new URL(currentUrl);
  } catch {
    current = new URL('/mff', request.url);
  }

  const forwarded = {
    api_key: POSTHOG_TOKEN,
    event: payload.event,
    distinct_id: payload.distinct_id,
    properties: {
      ...properties,
      $process_person_profile: false,
      $current_url: current.toString(),
      $host: current.hostname,
      $pathname: current.pathname,
      $raw_user_agent: request.headers.get('user-agent') ?? undefined,
      analytics_surface: 'mff_manifesto',
    },
  };

  try {
    const response = await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwarded),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[mff-analytics] posthog rejected event', payload.event, response.status);
      return NextResponse.json({ ok: false, error: 'upstream_rejected' }, { status: 502 });
    }
  } catch {
    console.error('[mff-analytics] posthog request failed', payload.event);
    return NextResponse.json({ ok: false, error: 'upstream_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
