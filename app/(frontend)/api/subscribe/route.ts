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

  // Reconcile: subscribe to chosen lists (status=1), unsubscribe from the
  // ones they didn't pick (status=2). Without the unsubscribe leg, switching
  // from "All" to "Fiction" leaves the contact on both lists and they get
  // duplicate emails since the publish fan-out sends one campaign per list.
  const subscribeFailures: string[] = [];
  const unsubscribeFailures: string[] = [];
  await Promise.all(
    VALID_AUDIENCES.map(async (audience) => {
      const wantsIt = audiences.includes(audience);
      try {
        const listId = getAudienceListId(audience);
        await syncSubscriberToActiveCampaign({
          email,
          listIdOverride: listId,
          status: wantsIt ? 1 : 2,
        });
      } catch (err) {
        console.error(
          `[subscribe] AC ${wantsIt ? 'subscribe' : 'unsubscribe'} failed for ${audience}:`,
          email,
          err,
        );
        (wantsIt ? subscribeFailures : unsubscribeFailures).push(audience);
      }
    }),
  );

  if (subscribeFailures.length === audiences.length) {
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    subscribed: audiences.filter((a) => !subscribeFailures.includes(a)),
  });
}
