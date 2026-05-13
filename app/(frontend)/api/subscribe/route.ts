import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAudienceListId, syncSubscriberToActiveCampaign } from '@/lib/activecampaign';
import { logger } from '@/lib/logger';
import {
  VALID_AUDIENCES,
  VALID_SOURCES,
  VALID_MAGNETS,
  type Magnet,
} from '@/lib/subscribe-types';
import { parseBody } from '@/lib/validation';

const MAGNETS: Record<Magnet, { files: Array<{ url: string; filename: string; label: string }> }> = {
  story: {
    files: [
      { url: '/lead-magnets/la-ligne-du-marais.pdf',  filename: 'la-ligne-du-marais.pdf',  label: 'PDF' },
      { url: '/lead-magnets/la-ligne-du-marais.epub', filename: 'la-ligne-du-marais.epub', label: 'EPUB' },
    ],
  },
};

const subscribeSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Email must be a valid address.'),
  audiences: z
    .array(z.enum(VALID_AUDIENCES))
    .min(1, 'Pick at least one list (All, Fiction, or Essays).')
    .transform((val) => [...new Set(val)]),
  source: z.enum(VALID_SOURCES).optional(),
  magnet: z.enum(VALID_MAGNETS).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(subscribeSchema, request);
  if (!parsed.ok) return parsed.response;

  const { email, audiences, source, magnet } = parsed.data;

  // For each audience list: subscribe the picked ones, unsubscribe the rest.
  // Unsubscribing from the unpicked lists is how "I used to subscribe to
  // Fiction and now I want Essays only" works as a single form submit.
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

  // Treat the request as failed only if every CHOSEN audience failed to
  // subscribe. Unsubscribe failures are logged but never bubble up — they're
  // cleanup, not the user's intent.
  if (subscribeFailures.length === audiences.length) {
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again.' },
      { status: 502 },
    );
  }

  // Surface attribution in logs so we can answer "which page is converting?"
  // without an analytics roundtrip. Email is intentionally omitted.
  console.log(
    '[subscribe] ok',
    JSON.stringify({ source: source ?? null, magnet: magnet ?? null }),
  );

  return NextResponse.json({
    ok: true,
    subscribed: audiences.filter((a) => !subscribeFailures.includes(a)),
    ...(magnet ? { magnet: MAGNETS[magnet] } : {}),
  });
}
