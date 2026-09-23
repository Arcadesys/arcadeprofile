import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audienceList, challengeTtlMilliseconds, createVerificationToken, encryptSignupEmail, lookupKitSubscriber, newChallengeId, PostmarkRejectedError, putChallenge, redisCommand, sendVerificationEmail, signupCooldownKey, type SignupChallenge } from '@/lib/writing-signup';
import { VALID_AUDIENCES, VALID_MAGNETS, VALID_SOURCES, VALID_UPDATE_MODES, type Magnet } from '@/lib/subscribe-types';
import { parseBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAGNETS: Record<Magnet, { files: Array<{ url: string; filename: string; label: string }> }> = {
  story: { files: [
    { url: '/lead-magnets/la-ligne-du-marais.pdf', filename: 'la-ligne-du-marais.pdf', label: 'PDF' },
    { url: '/lead-magnets/la-ligne-du-marais.epub', filename: 'la-ligne-du-marais.epub', label: 'EPUB' },
  ] },
  'it-takes-a-zoo-complete': { files: [{ url: '/novels/it-takes-a-zoo/complete/pdf', filename: 'it-takes-a-zoo-complete.pdf', label: 'Complete PDF' }] },
};
const schema = z.object({
  email: z.string().trim().min(1).email(),
  audiences: z.array(z.enum(VALID_AUDIENCES)).min(1).transform(audienceList),
  source: z.enum(VALID_SOURCES).optional(),
  magnet: z.enum(VALID_MAGNETS).optional(),
  updateMode: z.enum(VALID_UPDATE_MODES).default('replace'),
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' } });
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(schema, request);
  if (!parsed.ok) return parsed.response;
  const email = parsed.data.email.toLowerCase();
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) return json({ error: 'Signup is temporarily unavailable.' }, 503);
  if (!process.env.POSTMARK_SERVER_TOKEN?.trim() || !process.env.POSTMARK_FROM_EMAIL?.trim()) return json({ error: 'Signup is temporarily unavailable.' }, 503);
  try {
    // Read only. Suppressed states must not receive a verification message or any Kit writes.
    const subscriber = await lookupKitSubscriber(email, apiKey);
    if (subscriber && ['cancelled', 'bounced', 'complained'].includes(subscriber.state)) {
      return json({ ok: true, confirmationRequired: true, ...(parsed.data.magnet ? { magnet: MAGNETS[parsed.data.magnet] } : {}) });
    }
    const id = newChallengeId();
    const cooldownKey = signupCooldownKey(email, parsed.data.audiences);
    const claimed = await redisCommand<string | null>(['SET', cooldownKey, id, 'EX', 600, 'NX']);
    if (claimed !== 'OK') return json({ ok: true, confirmationRequired: true, ...(parsed.data.magnet ? { magnet: MAGNETS[parsed.data.magnet] } : {}) });
    const createdAt = Date.now();
    const challenge: SignupChallenge = {
      encryptedEmail: encryptSignupEmail(email),
      audiences: parsed.data.audiences,
      source: parsed.data.source ?? null,
      createdAt,
      ...(subscriber ? { subscriberId: subscriber.id } : {}),
      status: 'pending',
    };
    let attemptedPostmark = false;
    try {
      await putChallenge(id, challenge);
      const token = createVerificationToken(id, createdAt + challengeTtlMilliseconds);
      attemptedPostmark = true;
      await sendVerificationEmail({ email, token, audiences: challenge.audiences });
    } catch (error) {
      if (!attemptedPostmark || error instanceof PostmarkRejectedError) {
        await redisCommand(['DEL', cooldownKey]);
        await redisCommand(['DEL', `writing:challenge:${id}`]);
        throw error;
      }
      // An ambiguous network result keeps the ten-minute keyed cooldown so a
      // retry cannot blindly send a duplicate verification message.
      return json({ ok: true, confirmationRequired: true, deliveryPending: true, ...(parsed.data.magnet ? { magnet: MAGNETS[parsed.data.magnet] } : {}) }, 202);
    }
    return json({ ok: true, confirmationRequired: true, ...(parsed.data.magnet ? { magnet: MAGNETS[parsed.data.magnet] } : {}) });
  } catch {
    // Request data, email addresses, tokens, and provider bodies never enter logs.
    return json({ error: 'Could not send a confirmation email right now. Please try again.' }, 502);
  }
}
