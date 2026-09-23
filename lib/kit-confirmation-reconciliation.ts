import type { Audience } from './subscribe-types';
import { challengeIndexKey, getChallenge, redisCommand, saveChallengeIfStatus } from './writing-signup';

type Fetcher = typeof fetch;
const TAG_ENV: Record<Audience, string> = { all: 'KIT_TAG_ALL_WRITING_ID', fiction: 'KIT_TAG_FICTION_ID', essays: 'KIT_TAG_ESSAYS_ID', lab: 'KIT_TAG_LAB_ID' };

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
      const payload = await response.json() as { subscriber?: { id?: unknown; state?: unknown } };
      if (payload.subscriber?.id !== challenge.subscriberId || typeof payload.subscriber.state !== 'string') throw new Error('Kit subscriber status was invalid');
      if (payload.subscriber.state !== 'active') {
        if (['cancelled', 'bounced', 'complained'].includes(payload.subscriber.state)) {
          challenge.status = 'blocked';
          delete challenge.encryptedEmail;
          await saveChallengeIfStatus(id, challenge, 'awaiting-kit', undefined, fetcher);
        } else pending += 1;
        continue;
      }
      const provenanceTag = process.env.KIT_TAG_ARCADEPROFILE_ID?.trim() ?? '';
      const tagIds = [...new Set([...challenge.audiences.map((audience) => process.env[TAG_ENV[audience]]?.trim() ?? ''), provenanceTag])];
      if (tagIds.some((tagId) => !/^\d+$/.test(tagId))) throw new Error('Kit audience tags are not configured');
      let allSucceeded = true;
      for (const tagId of tagIds) {
        const tag = await fetcher(`https://api.kit.com/v4/tags/${tagId}/subscribers/${challenge.subscriberId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': input.apiKey }, body: '{}', signal: AbortSignal.timeout(8000),
        });
        if (!tag.ok) allSucceeded = false;
      }
      if (!allSucceeded) throw new Error('Kit tag update failed');
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
