import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAudienceListId, syncSubscriberToActiveCampaign } from '@/lib/activecampaign';
import { logger } from '@/lib/logger';
import { parseBody } from '@/lib/validation';

const VALID_AUDIENCES = ['all', 'fiction', 'essays'] as const;

const subscribeSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Email must be a valid address.'),
  audiences: z
    .array(z.enum(VALID_AUDIENCES))
    .min(1, 'Pick at least one list (All, Fiction, or Essays).')
    .transform((val) => [...new Set(val)]),
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(subscribeSchema, request);
  if (!parsed.ok) return parsed.response;

  const { email, audiences } = parsed.data;

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
        logger.error(
          { err, audience, email, op: wantsIt ? 'subscribe' : 'unsubscribe' },
          '[subscribe] ActiveCampaign sync failed',
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
