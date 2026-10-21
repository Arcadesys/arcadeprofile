import { createHash } from 'node:crypto';

export const ESSAY_SEGMENT_ENVS = ['RESEND_SEGMENT_ESSAY_BROADCAST_ID'] as const;
export function getEssaySegmentIds(env: Record<string, string | undefined> = process.env): string[] {
  const values = ESSAY_SEGMENT_ENVS.map((name) => env[name]?.trim() ?? '');
  if (values.some((id) => !/^[a-f0-9-]{20,64}$/i.test(id))) throw new Error('Resend essay segments are not configured');
  return [...new Set(values)];
}
export function hashSegmentAudience(ids: readonly string[]) { return createHash('sha256').update([...new Set(ids)].sort().join(',')).digest('hex'); }

async function request(url: string, apiKey: string, method: string, payload: unknown, fetcher: typeof fetch) {
  const response = await fetcher(url, { method, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Resend broadcast request failed');
  return await response.json() as Record<string, unknown>;
}

/** Create a draft first, then explicitly schedule it. A failure between requests leaves a draft, never an implicit send. */
export async function createAndScheduleResendBroadcast(input: {
  apiKey: string; from: string; subject: string; html: string; description: string;
  segmentIds: string[]; sendAt: string; fetchImpl?: typeof fetch;
}): Promise<{ id: string; sendAt: string }> {
  const fetcher = input.fetchImpl ?? fetch;
  const ids = [...new Set(input.segmentIds)];
  if (!ids.length || ids.some((id) => !/^[a-f0-9-]{20,64}$/i.test(id))) throw new Error('Invalid Resend broadcast segments');
  const unsubscribe = '{{{RESEND_UNSUBSCRIBE_URL}}}';
  if (!input.html.includes(unsubscribe)) throw new Error('Broadcast is missing the Resend unsubscribe link');
  const created = await request('https://api.resend.com/broadcasts', input.apiKey, 'POST', {
    segmentId: ids[0],
    from: input.from, subject: input.subject, html: input.html,
  }, fetcher);
  if (typeof created.id !== 'string' || !/^[a-f0-9-]{20,64}$/i.test(created.id)) throw new Error('Resend returned an invalid draft receipt');
  const sent = await request(`https://api.resend.com/broadcasts/${encodeURIComponent(created.id)}/send`, input.apiKey, 'POST', { scheduled_at: input.sendAt }, fetcher);
  if (typeof sent.id !== 'string' || sent.id !== created.id) throw new Error('Resend returned an invalid scheduled broadcast receipt');
  return { id: created.id, sendAt: input.sendAt };
}
