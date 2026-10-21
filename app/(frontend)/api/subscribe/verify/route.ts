import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmResendContact } from '@/lib/resend-contacts';
import { parseVerificationToken, getChallenge, decryptSignupEmail, newProcessingToken, redisCommand, releaseSignupLock, saveChallengeIfStatus } from '@/lib/writing-signup';
import { deliverWritingWelcome } from '@/lib/welcome-delivery';
import { signupEmailDigest } from '@/lib/writing-signup';
import type { Audience } from '@/lib/subscribe-types';
import { isArcadesAudience } from '@/lib/subscription-audiences';

export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().min(1).max(256), action: z.enum(['confirm', 'cancel']) });
const labels: Record<Audience, string> = { all: 'All Writing', fiction: 'Fiction', essays: 'Essays', lab: 'Lab', 'queer-columns': 'Queer Columns', 'work-ai': 'Work / AI', th4f: 'TH4F' };
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' } });

export async function POST(request: Request) {
  let parsed: z.infer<typeof schema>;
  try { parsed = schema.parse(await request.json()); } catch { return json({ error: 'This confirmation link is invalid or expired.' }, 400); }
  const token = parseVerificationToken(parsed.token); if (!token) return json({ error: 'This confirmation link is invalid or expired.' }, 400);
  const apiKey = process.env.RESEND_CONTACTS_API_KEY?.trim(); if (!apiKey) return json({ error: 'Confirmation is temporarily unavailable.' }, 503);
  const lockKey = `writing:claim-lock:${token.id}`; const lockToken = newProcessingToken();
  try {
    if (await redisCommand<string | null>(['SET', lockKey, lockToken, 'EX', 120, 'NX']) !== 'OK') return json({ error: 'This request is already being processed. Please try again shortly.' }, 409);
    const challenge = await getChallenge(token.id);
    if (!challenge || (Date.now() > token.expiresAt && (!challenge.verifiedAt || Date.now() > challenge.verifiedAt + 30 * 86400000))) return json({ error: 'This confirmation link is invalid or expired.' }, 410);
    if (['cancelled', 'blocked'].includes(challenge.status)) return json({ error: 'This signup request is no longer available.' }, 410);
    if (challenge.status === 'complete') return parsed.action === 'cancel' ? json({ error: 'This request is already confirmed.' }, 409) : json({ ok: true, status: 'complete' });
    if (parsed.action === 'cancel') {
      if (challenge.status !== 'pending') return json({ error: 'This request has already started processing.' }, 409);
      challenge.status = 'cancelled'; delete challenge.encryptedEmail;
      return await saveChallengeIfStatus(token.id, challenge, 'pending') === 'updated' ? json({ ok: true, status: 'cancelled' }) : json({ error: 'This request has already started.' }, 409);
    }
    const previousToken = challenge.status === 'processing' ? challenge.processingToken : undefined;
    if (challenge.status === 'processing' && (challenge.processingUntil ?? 0) > Date.now()) return json({ error: 'This request is already being processed.' }, 409);
    challenge.status = 'processing'; challenge.verifiedAt ??= Date.now(); delete challenge.source;
    challenge.processingToken = lockToken; challenge.processingUntil = Date.now() + 105000;
    if (await saveChallengeIfStatus(token.id, challenge, previousToken ? 'processing' : 'pending', previousToken) !== 'updated') return json({ error: 'This request has already changed. Refresh and try again.' }, 409);
    const email = challenge.encryptedEmail ? decryptSignupEmail(challenge.encryptedEmail).trim().toLowerCase() : '';
    if (!email || (challenge.emailDigest && signupEmailDigest(email) !== challenge.emailDigest)) return json({ error: 'This confirmation link is no longer available.' }, 410);
    const applied = await confirmResendContact({ email, audiences: challenge.audiences, apiKey });
    if (!applied.ok) {
      challenge.status = 'blocked'; delete challenge.encryptedEmail; delete challenge.processingToken; delete challenge.processingUntil;
      await saveChallengeIfStatus(token.id, challenge, 'processing', lockToken);
      return json({ error: 'This address is suppressed and cannot be resubscribed.' }, 409);
    }
    // Retain encryptedEmail while welcome delivery is pending so a rejected send
    // can retry after the processing lease expires. Clear it only on completion.
    challenge.subscriberId = applied.contactId;
    if (await saveChallengeIfStatus(token.id, challenge, 'processing', lockToken) !== 'updated') return json({ error: 'This request has already changed. Refresh and try again.' }, 409);
    if (challenge.audiences.some(isArcadesAudience) && challenge.emailDigest) {
      const welcome = await deliverWritingWelcome({ email, subscriberId: applied.contactId, emailDigest: challenge.emailDigest, audiences: challenge.audiences });
      if (welcome === 'rejected') return json({ error: 'Preferences are saved, but the welcome email was rejected. Retry to request it again.' }, 502);
    }
    challenge.status = 'complete'; delete challenge.encryptedEmail; delete challenge.processingToken; delete challenge.processingUntil;
    if (await saveChallengeIfStatus(token.id, challenge, 'processing', lockToken) !== 'updated') return json({ error: 'This request was already completed.' }, 409);
    return json({ ok: true, status: 'complete', preferences: challenge.audiences.map((audience) => labels[audience]) });
  } catch { return json({ error: 'Confirmation could not be completed. Please retry this link.' }, 502); }
  finally { try { await releaseSignupLock(lockKey, lockToken); } catch { /* lock expires automatically */ } }
}
