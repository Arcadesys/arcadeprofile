import assert from 'node:assert/strict';
import test from 'node:test';

import type { Post } from '@/payload-types';
import type { NewsletterDeliveryOutcome } from './post-newsletter-delivery';
import { publishScheduledPosts, type PayloadLike } from './publishScheduled';

// Minimal in-memory Payload-like fixture covering the queries publishScheduledPosts
// makes: findGlobal for publish-queue, find(posts) by `id in`, by published/recent,
// by due (`scheduledPublishDate <= now` + scheduled/draft/null status), and by stuck.
// Plus `update(posts, id, data)`. Filtering is dispatched on the shape of `where`.

interface FixturePost {
  id: number;
  slug: string;
  title: string;
  publish_status: Post['publish_status'];
  scheduledPublishDate: string | null;
  publishedDate: string | null;
  group: string | null;
  order: number | null;
  suppressNewsletter?: boolean | null;
  newsletterSend?: { status?: string | null; lastSyncedAt?: string | null } | null;
}

function buildFixture(initial: FixturePost[], queue: { fictionIds: number[]; essaysIds: number[] }) {
  const store = new Map<number, FixturePost>();
  for (const p of initial) store.set(p.id, { ...p });

  const updates: Array<{ id: number; data: Record<string, unknown> }> = [];

  const payload: Record<string, unknown> = {
    findGlobal: async ({ slug }: { slug: string }) => {
      if (slug !== 'publish-queue') throw new Error(`unexpected global: ${slug}`);
      return {
        fictionQueue: queue.fictionIds.map((id) => ({ post: id })),
        essaysQueue: queue.essaysIds.map((id) => ({ post: id })),
      };
    },
    find: async (args: Record<string, unknown>) => {
      if (args.collection !== 'posts') throw new Error(`unexpected collection: ${args.collection}`);
      const where = (args.where ?? {}) as Record<string, unknown>;
      const all = Array.from(store.values());

      // 1) `where.id.in` — used by loadPostsById in loadLiveQueueIds and syncQueueToPosts
      const idClause = (where as { id?: { in?: Array<number | string> } }).id;
      if (idClause?.in) {
        const ids = new Set(idClause.in.map(String));
        return { docs: all.filter((p) => ids.has(String(p.id))), totalDocs: ids.size };
      }

      // Everything else is an AND of clauses we recognize by shape.
      const and = (where as { and?: Array<Record<string, unknown>> }).and ?? [];

      let docs = [...all];
      for (const clause of and) {
        // publish_status: { in: ['published','sent'] }
        const status = (clause as { publish_status?: { in?: string[]; equals?: string | null; not_in?: string[] } })
          .publish_status;
        if (status?.in) {
          const vs = new Set(status.in);
          docs = docs.filter((p) => p.publish_status != null && vs.has(p.publish_status));
          continue;
        }
        if (typeof status?.equals === 'string') {
          docs = docs.filter((p) => p.publish_status === status.equals);
          continue;
        }
        const suppress = (clause as { suppressNewsletter?: { not_equals?: boolean } }).suppressNewsletter;
        if (typeof suppress?.not_equals === 'boolean') {
          docs = docs.filter((p) => p.suppressNewsletter !== suppress.not_equals);
          continue;
        }
        const newsletterStatus = (clause as { 'newsletterSend.status'?: { equals?: string } })[
          'newsletterSend.status'
        ];
        if (typeof newsletterStatus?.equals === 'string') {
          docs = docs.filter((p) => p.newsletterSend?.status === newsletterStatus.equals);
          continue;
        }
        // publishedDate: { greater_than_equal: iso }
        const pubDate = (clause as { publishedDate?: { greater_than_equal?: string } }).publishedDate;
        if (pubDate?.greater_than_equal) {
          const bound = pubDate.greater_than_equal;
          docs = docs.filter((p) => typeof p.publishedDate === 'string' && p.publishedDate >= bound);
          continue;
        }
        // scheduledPublishDate: { less_than_equal: iso } OR { less_than: iso }
        const sched = (clause as { scheduledPublishDate?: { less_than_equal?: string; less_than?: string } })
          .scheduledPublishDate;
        if (sched?.less_than_equal) {
          const bound = sched.less_than_equal;
          docs = docs.filter(
            (p) => typeof p.scheduledPublishDate === 'string' && p.scheduledPublishDate <= bound,
          );
          continue;
        }
        if (sched?.less_than) {
          const bound = sched.less_than;
          docs = docs.filter(
            (p) => typeof p.scheduledPublishDate === 'string' && p.scheduledPublishDate < bound,
          );
          continue;
        }
        // `or` clauses for publish_status (scheduled|draft|null) and (not_in published/sent | null)
        const or = (clause as { or?: Array<Record<string, unknown>> }).or;
        if (or) {
          docs = docs.filter((p) => {
            for (const sub of or) {
              const subAnd = (sub as { and?: Array<Record<string, unknown>> }).and;
              if (subAnd) {
                let matches = true;
                for (const subClause of subAnd) {
                  const ns = (subClause as { 'newsletterSend.status'?: { equals?: string | null } })[
                    'newsletterSend.status'
                  ];
                  if (typeof ns?.equals === 'string' && p.newsletterSend?.status !== ns.equals) {
                    matches = false;
                  }
                  const syncedAt = (subClause as { 'newsletterSend.lastSyncedAt'?: { less_than?: string } })[
                    'newsletterSend.lastSyncedAt'
                  ];
                  if (
                    syncedAt?.less_than &&
                    (typeof p.newsletterSend?.lastSyncedAt !== 'string' ||
                      p.newsletterSend.lastSyncedAt >= syncedAt.less_than)
                  ) {
                    matches = false;
                  }
                }
                if (matches) return true;
              }
              const s = (sub as { publish_status?: { equals?: string | null; not_in?: string[] } })
                .publish_status;
              if (s?.equals === null && p.publish_status == null) return true;
              if (typeof s?.equals === 'string' && p.publish_status === s.equals) return true;
              if (s?.not_in) {
                if (p.publish_status != null && !s.not_in.includes(p.publish_status)) return true;
              }
              const ns = (sub as { 'newsletterSend.status'?: { equals?: string | null } })[
                'newsletterSend.status'
              ];
              if (ns?.equals === null && (p.newsletterSend?.status == null)) return true;
              if (typeof ns?.equals === 'string' && p.newsletterSend?.status === ns.equals) return true;
            }
            return false;
          });
          continue;
        }
      }

      return { docs, totalDocs: docs.length };
    },
    update: async ({ id, data }: { collection: string; id: number | string; data: Record<string, unknown> }) => {
      const numId = Number(id);
      updates.push({ id: numId, data });
      const existing = store.get(numId);
      if (!existing) throw new Error(`unknown id ${id}`);
      const merged: FixturePost = { ...existing };
      if ('publish_status' in data) merged.publish_status = data.publish_status as FixturePost['publish_status'];
      if ('scheduledPublishDate' in data) merged.scheduledPublishDate = (data.scheduledPublishDate as string) ?? null;
      if ('publishedDate' in data) merged.publishedDate = (data.publishedDate as string) ?? null;
      if ('newsletterSend' in data) {
        merged.newsletterSend = data.newsletterSend as FixturePost['newsletterSend'];
      }
      store.set(numId, merged);
      return merged as unknown;
    },
  };

  return { payload: payload as unknown as PayloadLike, store, updates };
}

function sentNewsletter(): NewsletterDeliveryOutcome {
  return {
    kind: 'sent',
    state: {
      status: 'submitted',
      messageId: 'pm-1',
      targetedLists: '7,10',
      recipientCount: 1,
      sentAt: '2026-05-14T16:00:00.000Z',
      lastSyncedAt: '2026-05-14T16:00:00.000Z',
      lastError: null,
    },
  };
}

test('publishScheduledPosts self-heals a queue-#1 essay with a stale stored date', async () => {
  // Thursday 2026-05-14 noon Eastern. The essays queue's #1 post should land
  // on this date and become due for publishing.
  const now = new Date(Date.UTC(2026, 4, 14, 16, 0, 0));

  const initial: FixturePost[] = [
    {
      id: 101,
      slug: 'when-labor-gets-weird',
      title: 'When Labor Gets Weird',
      publish_status: 'scheduled',
      // Stale stored date — a week in the future, ahead of `now`. Pre-fix,
      // the cron's `<= now` filter would skip this row indefinitely.
      scheduledPublishDate: '2026-05-21T13:00:00.000Z',
      publishedDate: null,
      group: 'the-singularity-log',
      order: null,
    },
  ];

  const fx = buildFixture(initial, { fictionIds: [], essaysIds: [101] });

  const summary = await publishScheduledPosts(fx.payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(summary.processed, 1, 'one post should publish in a single run');
  assert.equal(summary.failed, 0);
  const promoted = fx.store.get(101)!;
  assert.equal(promoted.publish_status, 'sent');
  assert.ok(promoted.publishedDate, 'publishedDate should be set');

  // Three writes: sync rewrites scheduledPublishDate, publish flips public
  // and marks delivery pending, then delivery marks the row sent.
  const syncWrites = fx.updates.filter((u) => 'scheduledPublishDate' in u.data);
  const publishWrites = fx.updates.filter((u) => u.data.publish_status === 'published');
  const pendingWrites = fx.updates.filter(
    (u) => (u.data.newsletterSend as { status?: string } | undefined)?.status === 'pending',
  );
  const newsletterWrites = fx.updates.filter((u) => u.data.publish_status === 'sent');
  assert.equal(syncWrites.length, 1);
  assert.equal(publishWrites.length, 1);
  assert.equal(pendingWrites.length, 1);
  assert.equal(newsletterWrites.length, 1);
  assert.equal(String(syncWrites[0]!.data.scheduledPublishDate).slice(0, 10), '2026-05-14');
});

test('publishScheduledPosts no-ops sync when stored instant already matches queue slot', async () => {
  const now = new Date(Date.UTC(2026, 4, 14, 16, 0, 0));

  // Fresh, in-sync row: stored scheduled instant already matches today's
  // queue slot. The publish loop promotes it; sync should write nothing.
  const initial: FixturePost[] = [
    {
      id: 102,
      slug: 'fresh-essay',
      title: 'Fresh Essay',
      publish_status: 'scheduled',
      scheduledPublishDate: '2026-05-14T14:00:00.000Z',
      publishedDate: null,
      group: null,
      order: null,
    },
  ];

  const fx = buildFixture(initial, { fictionIds: [], essaysIds: [102] });
  const summary = await publishScheduledPosts(fx.payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(summary.processed, 1);
  const syncWrites = fx.updates.filter(
    (u) => 'scheduledPublishDate' in u.data && u.data.publish_status !== 'published',
  );
  assert.equal(syncWrites.length, 0, 'idempotent sync should write nothing');
});

test('publishScheduledPosts tolerates findGlobal failure and still publishes due rows', async () => {
  const now = new Date(Date.UTC(2026, 4, 14, 16, 0, 0));

  const initial: FixturePost[] = [
    {
      id: 103,
      slug: 'manually-dated',
      title: 'Manually Dated',
      publish_status: 'scheduled',
      scheduledPublishDate: '2026-05-13T00:00:00.000Z', // past
      publishedDate: null,
      group: null,
      order: null,
    },
  ];

  const fx = buildFixture(initial, { fictionIds: [], essaysIds: [] });
  // Break findGlobal to simulate the publish-queue read failing.
  (fx.payload as unknown as { findGlobal: () => Promise<unknown> }).findGlobal = async () => {
    throw new Error('queue read failed');
  };

  const summary = await publishScheduledPosts(fx.payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(summary.processed, 1, 'publish loop must run even when sync throws');
  assert.equal(fx.store.get(103)!.publish_status, 'sent');
});

test('publishScheduledPosts retries published posts with missing newsletter state', async () => {
  const now = new Date(Date.UTC(2026, 4, 14, 16, 0, 0));
  const initial: FixturePost[] = [
    {
      id: 104,
      slug: 'timeout-left-no-state',
      title: 'Timeout Left No State',
      publish_status: 'published',
      scheduledPublishDate: '2026-05-14',
      publishedDate: '2026-05-14',
      group: null,
      order: null,
      newsletterSend: null,
    },
  ];

  const fx = buildFixture(initial, { fictionIds: [], essaysIds: [] });
  let deliveries = 0;
  const summary = await publishScheduledPosts(fx.payload, {
    now,
    deliverNewsletter: async () => {
      deliveries += 1;
      return sentNewsletter();
    },
  });

  assert.equal(deliveries, 1);
  assert.equal(summary.processed, 1);
  assert.equal(summary.due, 1);
  assert.equal(fx.store.get(104)!.publish_status, 'sent');
});

test('publishScheduledPosts retries stale published posts with pending newsletter state', async () => {
  const now = new Date(Date.UTC(2026, 4, 14, 16, 0, 0));
  const initial: FixturePost[] = [
    {
      id: 105,
      slug: 'timeout-left-pending',
      title: 'Timeout Left Pending',
      publish_status: 'published',
      scheduledPublishDate: '2026-05-14',
      publishedDate: '2026-05-14',
      group: null,
      order: null,
      newsletterSend: { status: 'pending', lastSyncedAt: '2026-05-14T15:44:59.000Z' },
    },
  ];

  const fx = buildFixture(initial, { fictionIds: [], essaysIds: [] });
  let deliveries = 0;
  const summary = await publishScheduledPosts(fx.payload, {
    now,
    deliverNewsletter: async () => {
      deliveries += 1;
      return sentNewsletter();
    },
  });

  assert.equal(deliveries, 1);
  assert.equal(summary.processed, 1);
  assert.equal(fx.store.get(105)!.publish_status, 'sent');
});

test('publishScheduledPosts does not retry fresh pending newsletter state', async () => {
  const now = new Date(Date.UTC(2026, 4, 14, 16, 0, 0));
  const initial: FixturePost[] = [
    {
      id: 106,
      slug: 'fresh-pending',
      title: 'Fresh Pending',
      publish_status: 'published',
      scheduledPublishDate: '2026-05-14',
      publishedDate: '2026-05-14',
      group: null,
      order: null,
      newsletterSend: { status: 'pending', lastSyncedAt: '2026-05-14T15:50:00.000Z' },
    },
  ];

  const fx = buildFixture(initial, { fictionIds: [], essaysIds: [] });
  let deliveries = 0;
  const summary = await publishScheduledPosts(fx.payload, {
    now,
    deliverNewsletter: async () => {
      deliveries += 1;
      return sentNewsletter();
    },
  });

  assert.equal(deliveries, 0);
  assert.equal(summary.processed, 0);
  assert.equal(fx.store.get(106)!.publish_status, 'published');
});
