export const IMPORT_STATE: Readonly<Record<string, 'subscribed' | 'unsubscribed' | 'skip'>> = {
  active: 'subscribed', inactive: 'skip', cancelled: 'unsubscribed', bounced: 'unsubscribed', complained: 'unsubscribed',
};

export function expandImportedTopics(topics: readonly string[]) {
  const expanded = new Set(topics);
  if (expanded.has('all')) { expanded.add('fiction'); expanded.add('essays'); }
  return [...expanded];
}

export const DEFAULT_UNTAGGED_TOPICS = ['all', 'fiction', 'essays'] as const;

export function effectiveImportedTopics(row: { state: string; topics?: readonly string[] }) {
  if (row.state === 'active' && (row.topics ?? []).length === 0) return [...DEFAULT_UNTAGGED_TOPICS];
  return expandImportedTopics(row.topics ?? []);
}

export function planResendImport(subscribers: Array<{ state: string; topics: string[] }>) {
  const states: Record<string, number> = {};
  const topics: Record<string, number> = {};
  for (const row of subscribers) {
    const state = IMPORT_STATE[row.state] ?? 'skip';
    states[state] = (states[state] ?? 0) + 1;
    if (state === 'subscribed') for (const topic of effectiveImportedTopics(row)) topics[topic] = (topics[topic] ?? 0) + 1;
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
  const topics = effectiveImportedTopics(row).map((topic) => topicIds[topic] ? { id: topicIds[topic], subscription: 'opt_in' } : null)
    .filter((topic): topic is { id: string; subscription: string } => topic !== null);
  if (topics.length) await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/topics`, 'PATCH', topics);
  await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/segments/${encodeURIComponent(segmentId)}`, 'POST');
  return 'subscribed' as const;
}

export type BackfillRow = { email: string; state: string; topics: string[] };

/** Repairs the imported active list's segment membership and fills only missing Kit topic choices. */
export async function backfillResendDefaultTopics(row: BackfillRow, topicIds: Record<string, string>, segmentId: string, request: ImportRequest) {
  if (row.state !== 'active') return 'skipped' as const;
  if (!/^[a-f0-9-]{20,64}$/i.test(segmentId)) throw new Error('Resend subscribed broadcast segment is not configured');
  const email = row.email.trim().toLowerCase();
  if (await request(`https://api.resend.com/suppressions/${encodeURIComponent(email)}`)) return 'suppressed' as const;
  const found = await request(`https://api.resend.com/contacts/${encodeURIComponent(email)}`);
  const contact = found ? (found.contact ?? found) as Record<string, unknown> : null;
  if (!contact || typeof contact.id !== 'string' || contact.unsubscribed === true) return 'skipped' as const;

  // Segment repair is safe for every Kit-active contact. Topic writes are limited to
  // the three explicit owner-approved defaults and only when the Kit snapshot is untagged.
  await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/segments/${encodeURIComponent(segmentId)}`, 'POST');
  if ((row.topics ?? []).length === 0) {
    const topics = DEFAULT_UNTAGGED_TOPICS.map((topic) => ({ id: topicIds[topic], subscription: 'opt_in' })).filter((topic) => Boolean(topic.id));
    if (topics.length !== DEFAULT_UNTAGGED_TOPICS.length) throw new Error('All default topic IDs are required');
    await request(`https://api.resend.com/contacts/${encodeURIComponent(contact.id)}/topics`, 'PATCH', topics);
    return 'backfilled' as const;
  }
  return 'segment-repaired' as const;
}
