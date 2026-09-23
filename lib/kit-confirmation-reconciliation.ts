import { isArcadesAudience, kitTagId } from './subscription-audiences';
import { challengeIndexKey, getChallenge, redisCommand, saveChallengeIfStatus, signupEmailDigest } from './writing-signup';
import { sendWritingWelcomeOnce } from './writing-welcome-email';

type Fetcher = typeof fetch;

/** Reconcile only audience choices stored after a signed verification POST. */
export async function reconcileVerifiedKitSignups(input: { apiKey: string; fetcher?: Fetcher }) {
  const fetcher = input.fetcher ?? fetch;
  const ids = await redisCommand<string[]>(['SMEMBERS', challengeIndexKey()], fetcher);
  if (!Array.isArray(ids)) throw new Error('Signup ledger response was invalid');
  let checked = 0;
  let tagged = 0;
  let pending = 0;
  let failed = 0;
  for (const id of ids.slice(0, 200)) {
    if (!/^[a-f0-9]{32}$/.test(id)) { await redisCommand(['SREM', challengeIndexKey(), id], fetcher); continue; }
    const challenge = await getChallenge(id, fetcher);
    if (!challenge || challenge.status !== 'awaiting-kit' || !challenge.subscriberId) {
      await redisCommand(['SREM', challengeIndexKey(), id], fetcher);
      continue;
    }
    checked += 1;
    try {
      const response = await fetcher(`https://api.kit.com/v4/subscribers/${challenge.subscriberId}`, {
        headers: { 'X-Kit-Api-Key': input.apiKey }, signal: AbortSignal.timeout(8000), cache: 'no-store',
      });
      if (!response.ok) throw new Error('Kit status lookup failed');
      const payload = await response.json() as { subscriber?: { id?: unknown; state?: unknown; email_address?: unknown } };
      if (payload.subscriber?.id !== challenge.subscriberId || typeof payload.subscriber.state !== 'string') throw new Error('Kit subscriber status was invalid');
      const kitEmail = typeof payload.subscriber.email_address === 'string' ? payload.subscriber.email_address.trim().toLowerCase() : '';
      if (challenge.emailDigest && (!kitEmail || signupEmailDigest(kitEmail) !== challenge.emailDigest)) {
        challenge.status = 'blocked';
        await saveChallengeIfStatus(id, challenge, 'awaiting-kit', undefined, fetcher);
        continue;
      }
      if (payload.subscriber.state !== 'active') {
        if (['cancelled', 'bounced', 'complained'].includes(payload.subscriber.state)) {
          challenge.status = 'blocked';
          delete challenge.encryptedEmail;
          await saveChallengeIfStatus(id, challenge, 'awaiting-kit', undefined, fetcher);
        } else pending += 1;
        continue;
      }
      const provenanceTag = process.env.KIT_TAG_ARCADEPROFILE_ID?.trim() ?? '';
      const tagIds = [...new Set([...challenge.audiences.map(kitTagId), ...(challenge.audiences.some(isArcadesAudience) ? [provenanceTag] : [])])];
      if (tagIds.some((tagId) => !/^\d+$/.test(tagId))) throw new Error('Kit audience tags are not configured');
      let allSucceeded = true;
      for (const tagId of tagIds) {
        const tag = await fetcher(`https://api.kit.com/v4/tags/${tagId}/subscribers/${challenge.subscriberId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': input.apiKey }, body: '{}', signal: AbortSignal.timeout(8000),
        });
        if (!tag.ok) allSucceeded = false;
      }
      if (!allSucceeded) throw new Error('Kit tag update failed');
      if (challenge.emailDigest && kitEmail) {
        // Recheck Kit after tag writes; DOI-pending and newly cancelled contacts
        // never receive a welcome. The only recipient source is Kit's verified
        // profile for a Redis record created by the explicit confirmation POST.
        const current = await fetcher(`https://api.kit.com/v4/subscribers/${challenge.subscriberId}`, {
          headers: { 'X-Kit-Api-Key': input.apiKey }, signal: AbortSignal.timeout(8000), cache: 'no-store',
        });
        if (!current.ok) throw new Error('Kit status recheck failed');
        const currentPayload = await current.json() as { subscriber?: { id?: unknown; state?: unknown; email_address?: unknown } };
        const currentEmail = typeof currentPayload.subscriber?.email_address === 'string' ? currentPayload.subscriber.email_address.trim().toLowerCase() : '';
        if (currentPayload.subscriber?.id !== challenge.subscriberId || currentPayload.subscriber.state !== 'active' || !currentEmail || signupEmailDigest(currentEmail) !== challenge.emailDigest) {
          if (['cancelled', 'bounced', 'complained'].includes(String(currentPayload.subscriber?.state))) {
            challenge.status = 'blocked';
            await saveChallengeIfStatus(id, challenge, 'awaiting-kit', undefined, fetcher);
          } else pending += 1;
          continue;
        }
        if (challenge.audiences.some(isArcadesAudience)) {
          const welcome = await sendWritingWelcomeOnce({ email: currentEmail, subscriberId: challenge.subscriberId, emailDigest: challenge.emailDigest, audiences: challenge.audiences, fetcher });
          if (welcome === 'rejected') throw new Error('Writing welcome was rejected');
        }
      }
      challenge.status = 'complete';
      delete challenge.encryptedEmail;
      await saveChallengeIfStatus(id, challenge, 'awaiting-kit', undefined, fetcher);
      tagged += challenge.audiences.length;
    } catch {
      failed += 1;
    }
  }
  return { checked, tagged, pending, failed, remaining: Math.max(0, ids.length - Math.min(ids.length, 200)) };
}
