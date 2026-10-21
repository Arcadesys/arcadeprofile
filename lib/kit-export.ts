export type KitTopic = 'all' | 'fiction' | 'essays' | 'lab' | 'queer-columns' | 'work-ai' | 'th4f';
export type KitExportSubscriber = { email: string; state: string; topics: KitTopic[]; created_at: string };
export type KitExportSnapshot = {
  version: 2;
  exported_at: string;
  export_scope: { status: 'all'; includes_tags: true; tagged_subscriber_count: number; active_tagged_subscriber_count: number };
  subscribers: KitExportSubscriber[];
  broadcasts: Array<{ subject: string; status: string; send_date: string; recipients: number }>;
};

const KIT_TAG_TOPICS: Readonly<Record<string, KitTopic>> = {
  '23851250': 'all',
  '23851251': 'fiction',
  '23851252': 'essays',
  '23851253': 'lab',
  '23866437': 'queer-columns',
  '23806915': 'work-ai',
  '23808390': 'th4f',
};

const KIT_TAG_NAMES: Readonly<Record<string, KitTopic>> = {
  'arcadeprofile: all writing': 'all',
  'arcadeprofile: fiction': 'fiction',
  'arcadeprofile: essays': 'essays',
  'arcadeprofile: lab': 'lab',
  'arcadeprofile: queer columns': 'queer-columns',
  'interest: work / ai': 'work-ai',
  th4f: 'th4f',
};

export function kitListUrl(kind: 'subscribers' | 'broadcasts', after = '') {
  const url = new URL(`https://api.kit.com/v4/${kind}`);
  url.searchParams.set('per_page', '100');
  if (kind === 'subscribers') {
    url.searchParams.set('status', 'all');
    url.searchParams.set('include', 'tags');
  }
  if (after) url.searchParams.set('after', after);
  return url;
}

export function topicsFromKitTags(input: unknown, strict: boolean): KitTopic[] {
  if (!Array.isArray(input)) throw new Error('Kit subscriber tags were not included in the export response');
  const topics = new Set<KitTopic>();
  for (const value of input) {
    if (!value || typeof value !== 'object') {
      if (strict) throw new Error('An active Kit subscriber has an unclassifiable tag');
      continue;
    }
    const tag = value as Record<string, unknown>;
    const byId = KIT_TAG_TOPICS[String(tag.id ?? '')];
    const byName = typeof tag.name === 'string' ? KIT_TAG_NAMES[tag.name.trim().toLowerCase()] : undefined;
    const topic = byId ?? byName;
    if (topic) topics.add(topic);
    else if (strict) throw new Error('An active Kit subscriber has an unclassifiable tag');
  }
  return [...topics];
}

export function normalizeKitSubscriber(input: Record<string, unknown>): KitExportSubscriber {
  const email = String(input.email_address ?? '');
  const state = String(input.state ?? '');
  if (!email || !state) throw new Error('Kit export contained an invalid subscriber row');
  const topics = topicsFromKitTags(input.tags, state === 'active');
  return { email, state, topics, created_at: String(input.created_at ?? '') };
}

export function makeKitExportSnapshot(subscribers: KitExportSubscriber[], broadcasts: KitExportSnapshot['broadcasts'], exportedAt = new Date().toISOString()): KitExportSnapshot {
  return {
    version: 2,
    exported_at: exportedAt,
    export_scope: {
      status: 'all',
      includes_tags: true,
      tagged_subscriber_count: subscribers.filter((row) => row.topics.length > 0).length,
      active_tagged_subscriber_count: subscribers.filter((row) => row.state === 'active' && row.topics.length > 0).length,
    },
    subscribers,
    broadcasts,
  };
}

export function assertSafeDefaultTopicBackfill(snapshot: Partial<KitExportSnapshot> & { subscribers?: KitExportSubscriber[] }) {
  const tagged = snapshot.subscribers?.filter((row) => row.topics.length > 0).length ?? 0;
  const activeTagged = snapshot.subscribers?.filter((row) => row.state === 'active' && row.topics.length > 0).length ?? 0;
  if (snapshot.version !== 2 || snapshot.export_scope?.status !== 'all' || snapshot.export_scope.includes_tags !== true) {
    throw new Error('Default-topic backfill requires a fresh all-state Kit export with tags included');
  }
  if (tagged === 0 || snapshot.export_scope.tagged_subscriber_count === 0 || tagged !== snapshot.export_scope.tagged_subscriber_count
      || activeTagged === 0 || activeTagged !== snapshot.export_scope.active_tagged_subscriber_count) {
    throw new Error('Default-topic backfill refused because Kit tag coverage is missing or inconsistent');
  }
}

export function assertCompleteKitSnapshotForUnsubscribeSync(snapshot: Partial<KitExportSnapshot> & { subscribers?: KitExportSubscriber[] }) {
  if (snapshot.version !== 2 || snapshot.export_scope?.status !== 'all' || snapshot.export_scope.includes_tags !== true) {
    throw new Error('Unsubscribe sync requires a fresh all-state Kit export with tags included');
  }
  assertKitNonActiveStateCoverage(snapshot.subscribers?.map((row) => row.state) ?? []);
}

export function assertKitNonActiveStateCoverage(states: Iterable<string>) {
  const stateSet = new Set(states);
  if (!['inactive', 'cancelled', 'bounced'].every((state) => stateSet.has(state))) {
    throw new Error('Unsubscribe sync refused because the Kit response is missing expected non-active states');
  }
}
