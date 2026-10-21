export const IMPORT_STATE: Readonly<Record<string, 'subscribed' | 'unsubscribed' | 'skip'>> = {
  active: 'subscribed', inactive: 'skip', cancelled: 'unsubscribed', bounced: 'unsubscribed', complained: 'unsubscribed',
};

export function expandImportedTopics(topics: readonly string[]) {
  const expanded = new Set(topics);
  if (expanded.has('all')) { expanded.add('fiction'); expanded.add('essays'); }
  return [...expanded];
}

export function planResendImport(subscribers: Array<{ state: string; topics: string[] }>) {
  const states: Record<string, number> = {};
  const topics: Record<string, number> = {};
  for (const row of subscribers) {
    const state = IMPORT_STATE[row.state] ?? 'skip';
    states[state] = (states[state] ?? 0) + 1;
    if (state === 'subscribed') for (const topic of expandImportedTopics(row.topics ?? [])) topics[topic] = (topics[topic] ?? 0) + 1;
  }
  return { states, topics };
}

export type ImportRow = { email: string; state: string; topics: string[] };
export type ImportRequest = (url: string, method?: string, payload?: unknown) => Promise<Record<string, unknown> | null>;

export async function applyResendImportRow(row: ImportRow, topicIds: Record<string, string>, segmentId: string, request: ImportRequest) {
  const state = IMPORT_STATE[row.state] ?? 'skip';
  if (state === 'skip') return 'skipped' as const;
  if (!/^[a-f0-9-]{20,64}$/i.test(segmentId)) throw new Error('Resend subscribed broadcast segment is not configured');
  const email = row.email.trim().toLowerCase();
  if (state === 'subscribed') {
    if (await request(`https://api.resend.com/suppressions/${encodeURIComponent(email)}`)) return 'skipped' as const;
  }
  const found = await request(`https://api.resend.com/contacts/${encodeURIComponent(email)}`);
  let contact = found ? (found.contact ?? found) as Record<string, unknown> : null;
  if (!contact) {
    const created = await request('https://api.resend.com/contacts', 'POST', { email, unsubscribed: state === 'unsubscribed' });
    contact = created ? (created.contact ?? created) as Record<string, unknown> : null;
  }
  if (!contact || typeof contact.id !== 'string') throw new Error('Resend contact receipt was invalid');
  if (state === 'unsubscribed') {
    await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}`, 'PATCH', { unsubscribed: true });
    await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/segments/${encodeURIComponent(segmentId)}`, 'DELETE');
    return 'suppressed' as const;
  }
  if (contact.unsubscribed === true) {
    await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/segments/${encodeURIComponent(segmentId)}`, 'DELETE');
    return 'skipped' as const;
  }
  const topics = expandImportedTopics(row.topics ?? []).map((topic) => topicIds[topic] ? { id: topicIds[topic], subscription: 'opt_in' } : null)
    .filter((topic): topic is { id: string; subscription: string } => topic !== null);
  if (topics.length) await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/topics`, 'PATCH', topics);
  await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/segments/${encodeURIComponent(segmentId)}`, 'POST');
  return 'subscribed' as const;
}
