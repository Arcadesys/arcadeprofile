import { RESEND_TOPICS } from './subscription-audiences';

type Topic = { id: string; name: string; default_subscription?: string };
type Fetcher = typeof fetch;

export async function ensureResendTopics(apiKey: string, fetcher: Fetcher = fetch) {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const listed = await fetcher('https://api.resend.com/topics', { headers, signal: AbortSignal.timeout(20000) });
  if (!listed.ok) throw new Error('Resend topic list request failed');
  const body = await listed.json() as { data?: Topic[] };
  if (!Array.isArray(body.data)) throw new Error('Resend topic list response was invalid');
  const byName = new Map(body.data.filter((topic) => typeof topic.id === 'string' && typeof topic.name === 'string').map((topic) => [topic.name, topic.id]));
  const existingByName = new Map(body.data.filter((topic) => typeof topic.id === 'string' && typeof topic.name === 'string').map((topic) => [topic.name, topic]));
  const result: Record<string, string> = {};
  for (const topic of RESEND_TOPICS) {
    let id = byName.get(topic.name);
    const existing = existingByName.get(topic.name);
    if (existing && existing.default_subscription !== 'opt_out') throw new Error(`Resend topic ${topic.name} must have opt-out as its default subscription`);
    if (!id) {
      const created = await fetcher('https://api.resend.com/topics', {
        method: 'POST', headers, body: JSON.stringify({ name: topic.name, default_subscription: 'opt_out' }),
        signal: AbortSignal.timeout(20000),
      });
      if (!created.ok) throw new Error('Resend topic create request failed');
      const receipt = await created.json() as { id?: string; topic?: { id?: string } };
      id = receipt.id ?? receipt.topic?.id;
      if (typeof id !== 'string' || !id) throw new Error('Resend topic create receipt was invalid');
    }
    result[topic.env] = id;
  }
  return result;
}
