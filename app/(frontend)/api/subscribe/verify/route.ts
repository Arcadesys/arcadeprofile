import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseVerificationToken, getChallenge, decryptSignupEmail, newProcessingToken, redisCommand, releaseSignupLock, saveChallengeIfStatus } from '@/lib/writing-signup';
import { sendWritingWelcomeOnce } from '@/lib/writing-welcome-email';
import { signupEmailDigest } from '@/lib/writing-signup';
import type { Audience } from '@/lib/subscribe-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const bodySchema = z.object({ token: z.string().min(1).max(256), action: z.enum(['confirm', 'cancel']) });
const FORM_ENV: Record<Audience, string> = { all: 'KIT_FORM_ALL_ID', fiction: 'KIT_FORM_FICTION_ID', essays: 'KIT_FORM_ESSAYS_ID', lab: 'KIT_FORM_LAB_ID' };
const TAG_ENV: Record<Audience, string> = { all: 'KIT_TAG_ALL_WRITING_ID', fiction: 'KIT_TAG_FICTION_ID', essays: 'KIT_TAG_ESSAYS_ID', lab: 'KIT_TAG_LAB_ID' };
const labels: Record<Audience, string> = { all: 'All Writing', fiction: 'Fiction', essays: 'Essays', lab: 'Lab' };
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' } });

async function kitPost(url: string, apiKey: string, body: Record<string, string> = {}) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000), cache: 'no-store' });
  return response.ok;
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try { parsed = bodySchema.parse(await request.json()); } catch { return json({ error: 'This confirmation link is invalid or expired.' }, 400); }
  const token = parseVerificationToken(parsed.token);
  if (!token) return json({ error: 'This confirmation link is invalid or expired.' }, 400);
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) return json({ error: 'Confirmation is temporarily unavailable.' }, 503);

  const lockKey = `writing:claim-lock:${token.id}`;
  const lockToken = newProcessingToken();
  try {
    const locked = await redisCommand<string | null>(['SET', lockKey, lockToken, 'EX', 120, 'NX']);
    if (locked !== 'OK') return json({ error: 'This request is already being processed. Please try again shortly.' }, 409);
    const challenge = await getChallenge(token.id);
    if (!challenge || (Date.now() > token.expiresAt && (!challenge.verifiedAt || Date.now() > challenge.verifiedAt + 30 * 24 * 60 * 60 * 1000))) return json({ error: 'This confirmation link is invalid or expired.' }, 410);
    if (challenge.status === 'cancelled' || challenge.status === 'blocked') return json({ error: 'This signup request is no longer available.' }, 410);
    if (challenge.status === 'complete') {
      return parsed.action === 'cancel'
        ? json({ error: 'This request has already been confirmed and cannot be cancelled here.' }, 409)
        : json({ ok: true, status: 'complete' });
    }
    if (challenge.status === 'awaiting-kit') {
      return parsed.action === 'cancel'
        ? json({ error: 'This request has already been confirmed and cannot be cancelled here.' }, 409)
        : json({ ok: true, status: 'awaiting-kit' });
    }
    if (parsed.action === 'cancel') {
      if (challenge.status !== 'pending') return json({ error: 'This request has already started processing and can no longer be cancelled here.' }, 409);
      challenge.status = 'cancelled';
      delete challenge.encryptedEmail;
      const result = await saveChallengeIfStatus(token.id, challenge, 'pending');
      if (result !== 'updated') return json({ error: 'This request has already started and can no longer be cancelled.' }, 409);
      return json({ ok: true, status: 'cancelled' });
    }

    if (challenge.status === 'processing' && (challenge.processingUntil ?? 0) > Date.now()) {
      return json({ error: 'This request is already being processed. Please try again shortly.' }, 409);
    }
    const priorProcessingToken = challenge.status === 'processing' ? challenge.processingToken : undefined;
    if (challenge.status === 'pending') {
      challenge.status = 'processing';
      challenge.verifiedAt = Date.now();
      delete challenge.source;
      challenge.processingToken = lockToken;
      challenge.processingUntil = Date.now() + 105000;
      const result = await saveChallengeIfStatus(token.id, challenge, 'pending');
      if (result !== 'updated') return json({ error: 'This request has already changed. Refresh and try again.' }, 409);
    } else if (challenge.status === 'processing') {
      challenge.processingToken = lockToken;
      challenge.processingUntil = Date.now() + 105000;
      const result = await saveChallengeIfStatus(token.id, challenge, 'processing', priorProcessingToken);
      if (result !== 'updated') return json({ error: 'This request has already changed. Refresh and try again.' }, 409);
    }
    const activeLeaseToken = challenge.processingToken!;

    // This request follows an explicit user button press. Recheck the known Kit
    // subscriber state; create an inactive record only for a new signup.
    let subscriberId = challenge.subscriberId;
    let state: string | undefined;
    let subscriberEmail: string | undefined;
    if (subscriberId) {
      const response = await fetch(`https://api.kit.com/v4/subscribers/${subscriberId}`, {
        headers: { 'X-Kit-Api-Key': apiKey }, signal: AbortSignal.timeout(10000), cache: 'no-store',
      });
      if (!response.ok) return json({ error: 'Kit status could not be checked. Please retry this link.' }, 502);
      const payload = await response.json() as { subscriber?: { id?: unknown; state?: unknown; email_address?: unknown } };
      if (payload.subscriber?.id !== subscriberId || typeof payload.subscriber.state !== 'string') return json({ error: 'Kit returned an invalid subscriber status.' }, 502);
      state = payload.subscriber.state;
      if (typeof payload.subscriber.email_address === 'string') subscriberEmail = payload.subscriber.email_address.trim().toLowerCase();
      if (challenge.emailDigest && (!subscriberEmail || signupEmailDigest(subscriberEmail) !== challenge.emailDigest)) {
        challenge.status = 'blocked';
        delete challenge.encryptedEmail;
        delete challenge.processingToken;
        delete challenge.processingUntil;
        await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken);
        return json({ error: 'The Kit address no longer matches this confirmation request.' }, 409);
      }
    } else {
      if (!challenge.encryptedEmail) return json({ error: 'This confirmation link is no longer available.' }, 410);
      const email = decryptSignupEmail(challenge.encryptedEmail);
      subscriberEmail = email.trim().toLowerCase();
      const response = await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
        body: JSON.stringify({ email_address: email, state: 'inactive' }),
        signal: AbortSignal.timeout(10000), cache: 'no-store',
      });
      if (!response.ok) return json({ error: 'Kit could not accept this signup yet. Please retry the confirmation.' }, 502);
      const payload = await response.json() as { subscriber?: { id?: unknown; state?: unknown; email_address?: unknown } };
      if (typeof payload.subscriber?.id !== 'number' || !Number.isSafeInteger(payload.subscriber.id) || typeof payload.subscriber.state !== 'string') {
        return json({ error: 'Kit returned an invalid signup receipt.' }, 502);
      }
      subscriberId = payload.subscriber.id;
      state = payload.subscriber.state;
      const returnedEmail = typeof payload.subscriber.email_address === 'string' ? payload.subscriber.email_address.trim().toLowerCase() : '';
      if (!returnedEmail || (challenge.emailDigest && signupEmailDigest(returnedEmail) !== challenge.emailDigest)) {
        challenge.status = 'blocked';
        delete challenge.encryptedEmail;
        delete challenge.processingToken;
        delete challenge.processingUntil;
        await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken);
        return json({ error: 'Kit returned an address that does not match this confirmation request.' }, 409);
      }
      subscriberEmail = returnedEmail;
    }
    challenge.subscriberId = subscriberId;
    delete challenge.encryptedEmail;
    if (await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken) !== 'updated') return json({ error: 'This request has already changed. Refresh and try again.' }, 409);

    if (['cancelled', 'bounced', 'complained'].includes(state ?? '')) {
      challenge.status = 'blocked';
      delete challenge.processingToken;
      delete challenge.processingUntil;
      await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken);
      return json({ error: 'Kit cannot accept this address. No preferences were added.' }, 409);
    }
    if (!subscriberId || !['active', 'inactive'].includes(state ?? '')) {
      challenge.status = 'blocked';
      delete challenge.encryptedEmail;
      delete challenge.processingToken;
      delete challenge.processingUntil;
      await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken);
      return json({ error: 'Kit cannot accept this address. No preferences were added.' }, 409);
    }

    const configured = challenge.audiences.map((audience) => ({
      audience,
      formId: process.env[FORM_ENV[audience]]?.trim(),
      tagId: process.env[TAG_ENV[audience]]?.trim(),
    }));
    const provenanceTagId = process.env.KIT_TAG_ARCADEPROFILE_ID?.trim();
    if (!provenanceTagId || !/^\d+$/.test(provenanceTagId) || configured.some(({ formId, tagId }) => !formId || !/^\d+$/.test(formId) || !tagId || !/^\d+$/.test(tagId))) {
      return json({ error: 'Signup preferences are temporarily unavailable.' }, 503);
    }
    // Form membership endpoints are idempotent. A partial failure can be retried
    // from this same signed challenge without duplicating membership.
    const memberships = await Promise.all(configured.map(async ({ formId }) => {
      try { return await kitPost(`https://api.kit.com/v4/forms/${formId}/subscribers/${subscriberId}`, apiKey, { referrer: 'https://www.thearcades.me/subscribe' }); }
      catch { return false; }
    }));
    if (memberships.some((ok) => !ok)) return json({ error: 'Some preferences could not be submitted. Please retry this confirmation.' }, 502);

    if (state === 'active') {
      const tagIds = [...new Set([...configured.map(({ tagId }) => tagId!), provenanceTagId])];
      const writes = await Promise.all(tagIds.map(async (tagId) => {
        try { return await kitPost(`https://api.kit.com/v4/tags/${tagId}/subscribers/${subscriberId}`, apiKey); }
        catch { return false; }
      }));
      if (writes.some((ok) => !ok)) return json({ error: 'Preferences are saved, but audience updates are still retrying. Reopen this link to finish.' }, 502);
      if (challenge.emailDigest && subscriberEmail) {
        const current = await fetch(`https://api.kit.com/v4/subscribers/${subscriberId}`, {
          headers: { 'X-Kit-Api-Key': apiKey }, signal: AbortSignal.timeout(10000), cache: 'no-store',
        });
        if (!current.ok) return json({ error: 'Kit status could not be rechecked. Please retry this link.' }, 502);
        const currentPayload = await current.json() as { subscriber?: { id?: unknown; state?: unknown; email_address?: unknown } };
        const currentEmail = typeof currentPayload.subscriber?.email_address === 'string' ? currentPayload.subscriber.email_address.trim().toLowerCase() : '';
        if (currentPayload.subscriber?.id !== subscriberId || currentPayload.subscriber.state !== 'active' || !currentEmail || signupEmailDigest(currentEmail) !== challenge.emailDigest) {
          if (currentPayload.subscriber?.state === 'cancelled' || currentPayload.subscriber?.state === 'bounced' || currentPayload.subscriber?.state === 'complained') {
            challenge.status = 'blocked';
            delete challenge.processingToken;
            delete challenge.processingUntil;
            await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken);
          }
          return json({ error: 'Kit must report this address as active before a welcome email can be sent.' }, 409);
        }
        subscriberEmail = currentEmail;
        const welcome = await sendWritingWelcomeOnce({ email: subscriberEmail, subscriberId, emailDigest: challenge.emailDigest, audiences: challenge.audiences });
        if (welcome === 'rejected') return json({ error: 'Preferences are saved, but the welcome email was rejected. Retry to request it again.' }, 502);
      }
      challenge.status = 'complete';
      delete challenge.encryptedEmail;
      delete challenge.processingToken;
      delete challenge.processingUntil;
      if (await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken) !== 'updated') return json({ error: 'This request was already completed.' }, 409);
      return json({ ok: true, status: 'complete', preferences: challenge.audiences.map((audience) => labels[audience]) });
    }

    challenge.status = 'awaiting-kit';
    delete challenge.encryptedEmail;
    delete challenge.processingToken;
    delete challenge.processingUntil;
    if (await saveChallengeIfStatus(token.id, challenge, 'processing', activeLeaseToken) !== 'updated') return json({ error: 'This request was already completed.' }, 409);
    return json({ ok: true, status: 'awaiting-kit', preferences: challenge.audiences.map((audience) => labels[audience]) });
  } catch {
    return json({ error: 'Confirmation could not be completed. Please retry this link.' }, 502);
  } finally {
    try { await releaseSignupLock(lockKey, lockToken); } catch { /* lock expires automatically */ }
  }
}
