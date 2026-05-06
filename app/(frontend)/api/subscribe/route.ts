import { NextRequest, NextResponse } from 'next/server';

import { getAudienceListId, syncSubscriberToActiveCampaign } from '@/lib/activecampaign';

const VALID_AUDIENCES = ['all', 'fiction', 'essays'] as const;
type Audience = (typeof VALID_AUDIENCES)[number];

function parseAudiences(raw: unknown): Audience[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<Audience>();
  for (const item of raw) {
    if (typeof item === 'string' && (VALID_AUDIENCES as readonly string[]).includes(item)) {
      seen.add(item as Audience);
    }
  }
  return Array.from(seen);
}

export async function POST(request: NextRequest) {
  const { email, audiences: rawAudiences } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const audiences = parseAudiences(rawAudiences);
  if (audiences.length === 0) {
    return NextResponse.json(
      { error: 'Pick at least one list (All, Fiction, or Essays).' },
      { status: 400 },
    );
  }

  const failures: string[] = [];
  for (const audience of audiences) {
    try {
      const listId = getAudienceListId(audience);
      await syncSubscriberToActiveCampaign({ email, listIdOverride: listId });
    } catch (err) {
      console.error(`[subscribe] AC sync failed for ${audience}:`, email, err);
      failures.push(audience);
    }
  }

  if (failures.length === audiences.length) {
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, subscribed: audiences.filter((a) => !failures.includes(a)) });
}
