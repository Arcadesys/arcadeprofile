import type { Audience } from './subscribe-types';
import { resendTopicId } from './subscription-audiences';

type Contact = { id: string; email: string; unsubscribed: boolean };
const base = 'https://api.resend.com';
function headers(key: string) { return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }; }
async function body(response: Response) {
  if (!response.ok) throw new Error('Resend contact request failed');
  return await response.json() as Record<string, unknown>;
}
export async function findResendContact(email: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<Contact | null> {
  const url = `${base}/contacts/${encodeURIComponent(email.trim().toLowerCase())}`;
  const response = await fetcher(url, { headers: headers(apiKey), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (response.status === 404) return null;
  const data = await body(response);
  const contact = (data.contact ?? data) as Record<string, unknown> | undefined;
  if (!contact || typeof contact.id !== 'string' || typeof contact.email !== 'string' || typeof contact.unsubscribed !== 'boolean') throw new Error('Resend contact response was invalid');
  return { id: contact.id, email: contact.email, unsubscribed: contact.unsubscribed };
}

export async function isResendSuppressed(email: string, apiKey: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${base}/suppressions/${encodeURIComponent(email.trim().toLowerCase())}`, { headers: headers(apiKey), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error('Resend suppression lookup failed');
  return true;
}

/** Explicit confirmation only. Existing global suppression is never cleared. */
export async function confirmResendContact(input: { email: string; audiences: Audience[]; apiKey: string; fetcher?: typeof fetch }) {
  const fetcher = input.fetcher ?? fetch;
  const topics = [...new Set(input.audiences)].map((topic) => ({ id: resendTopicId(topic), subscription: 'opt_in' }));
  if (topics.some((topic) => !topic.id)) throw new Error('A Resend topic is not configured');
  if (await isResendSuppressed(input.email, input.apiKey, fetcher)) return { ok: false as const, suppressed: true as const };
  let contact = await findResendContact(input.email, input.apiKey, fetcher);
  if (contact?.unsubscribed) return { ok: false as const, suppressed: true as const };
  if (!contact) {
    const response = await fetcher(`${base}/contacts`, {
      method: 'POST', headers: headers(input.apiKey), body: JSON.stringify({ email: input.email.trim().toLowerCase(), unsubscribed: false }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await body(response);
    const created = (data.contact ?? data) as Record<string, unknown> | undefined;
    if (!created || typeof created.id !== 'string') throw new Error('Resend contact receipt was invalid');
    // Resend's create receipt returns the contact ID only; the requested values
    // establish the contact email and subscribed state for this new record.
    contact = { id: created.id, email: input.email.trim().toLowerCase(), unsubscribed: created.unsubscribed === true };
    if (contact.unsubscribed) return { ok: false as const, suppressed: true as const };
  }
  // Topic subscription is additive. The selected values are only set opt-in;
  // no unselected existing preferences are modified.
  const response = await fetcher(`${base}/contacts/${encodeURIComponent(contact.id)}/topics`, {
    method: 'PATCH', headers: headers(input.apiKey), body: JSON.stringify(topics), signal: AbortSignal.timeout(10000),
  });
  await body(response);
  return { ok: true as const, contactId: contact.id };
}

export async function unsubscribeResendContact(contactId: string, apiKey: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${base}/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PATCH', headers: headers(apiKey), body: JSON.stringify({ unsubscribed: true }), signal: AbortSignal.timeout(10000),
  });
  await body(response);
}

export async function lookupResendContactById(id: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<Contact | null> {
  const response = await fetcher(`${base}/contacts/${encodeURIComponent(id)}`, { headers: headers(apiKey), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (response.status === 404) return null;
  const data = await body(response); const contact = (data.contact ?? data) as Record<string, unknown> | undefined;
  if (!contact || typeof contact.id !== 'string' || typeof contact.email !== 'string' || typeof contact.unsubscribed !== 'boolean') throw new Error('Resend contact response was invalid');
  return { id: contact.id, email: contact.email, unsubscribed: contact.unsubscribed };
}
