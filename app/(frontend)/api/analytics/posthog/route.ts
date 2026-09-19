import { NextRequest, NextResponse } from 'next/server';

const POSTHOG_TOKEN =
  process.env.POSTHOG_PROJECT_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
  'phc_wH8qGy3tzYkfwDCLe9rZuBPxP7kaXWVocAnj6vVJFnaa';

const POSTHOG_HOST =
  process.env.POSTHOG_HOST ??
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  'https://us.i.posthog.com';

type AnalyticsPayload = {
  distinct_id?: string;
  event?: string;
  properties?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  let payload: AnalyticsPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!payload.event || !payload.distinct_id) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const properties = {
    ...payload.properties,
    $geoip_disable: false,
    $raw_user_agent: request.headers.get('user-agent') ?? undefined,
  };

  const response = await fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_TOKEN,
      event: payload.event,
      distinct_id: payload.distinct_id,
      properties,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('[site-analytics] posthog rejected event', payload.event, response.status);
    return NextResponse.json({ ok: false, error: 'upstream_rejected' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
