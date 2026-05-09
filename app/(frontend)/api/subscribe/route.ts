import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAudienceListId, syncSubscriberToActiveCampaign } from '@/lib/activecampaign';
import { logger } from '@/lib/logger';
import {
  DEFAULT_CADENCE,
  VALID_AUDIENCES,
  VALID_CADENCES,
  VALID_SOURCES,
  VALID_MAGNETS,
  type Cadence,
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
  cadence: z.enum(VALID_CADENCES).default(DEFAULT_CADENCE),
  source: z.enum(VALID_SOURCES).optional(),
  magnet: z.enum(VALID_MAGNETS).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(subscribeSchema, request);
  if (!parsed.ok) return parsed.response;

  const { email, audiences, cadence, source, magnet } = parsed.data;

  // Reconcile across BOTH cadences. The picked cadence's lists for the picked
  // audiences get status=1 (subscribe); every other (audience, cadence) pair
  // gets status=2 (unsubscribe). This is what makes "switch from per-post to
  // weekly" a single form submit: the contact moves between cadence lists
  // without the form needing to remember their prior state.
  const subscribeFailures: string[] = [];
  const unsubscribeFailures: string[] = [];
  const pairs: Array<{
    audience: (typeof VALID_AUDIENCES)[number];
    cadence: Cadence;
    wantsIt: boolean;
  }> = [];
  for (const a of VALID_AUDIENCES) {
    for (const c of VALID_CADENCES) {
      pairs.push({ audience: a, cadence: c, wantsIt: c === cadence && audiences.includes(a) });
    }
  }
  await Promise.all(
    pairs.map(async ({ audience, cadence: pairCadence, wantsIt }) => {
      try {
        const listId = getAudienceListId(audience, pairCadence);
        await syncSubscriberToActiveCampaign({
          email,
          listIdOverride: listId,
          status: wantsIt ? 1 : 2,
        });
      } catch (err) {
        logger.error(
          { err, audience, cadence: pairCadence, email, op: wantsIt ? 'subscribe' : 'unsubscribe' },
          '[subscribe] ActiveCampaign sync failed',
        );
        (wantsIt ? subscribeFailures : unsubscribeFailures).push(`${audience}:${pairCadence}`);
      }
    }),
  );

  // Treat the request as failed only if every CHOSEN audience-cadence pair
  // failed to subscribe. Unsubscribe failures are logged but never bubble up
  // — they're cleanup, not the user's intent.
  const wantedCount = audiences.length;
  const failedSubscribesForChosenCadence = subscribeFailures.length;
  if (failedSubscribesForChosenCadence === wantedCount) {
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again.' },
      { status: 502 },
    );
  }

  // Surface attribution in logs so we can answer "which page is converting?"
  // without an analytics roundtrip. Email is intentionally omitted.
  console.log(
    '[subscribe] ok',
    JSON.stringify({ source: source ?? null, magnet: magnet ?? null, cadence }),
  );

  const failedAudiences = new Set(
    subscribeFailures.map((f) => f.split(':')[0]),
  );
  return NextResponse.json({
    ok: true,
    cadence,
    subscribed: audiences.filter((a) => !failedAudiences.has(a)),
    ...(magnet ? { magnet: MAGNETS[magnet] } : {}),
  });
}
