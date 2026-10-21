import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCompleteKitSnapshotForUnsubscribeSync,
  assertKitNonActiveStateCoverage,
  assertSafeDefaultTopicBackfill,
  kitListUrl,
  makeKitExportSnapshot,
  normalizeKitSubscriber,
  topicsFromKitTags,
  type KitExportSubscriber,
} from './kit-export';

test('Kit v4 subscriber export requests every state and embeds tags', () => {
  const url = kitListUrl('subscribers');
  assert.equal(url.searchParams.get('status'), 'all');
  assert.equal(url.searchParams.get('include'), 'tags');
  assert.equal(url.searchParams.get('per_page'), '100');
  assert.equal(kitListUrl('subscribers', 'cursor').searchParams.get('after'), 'cursor');
  assert.equal(kitListUrl('broadcasts').searchParams.get('status'), null);
});

test('classifies actual Kit v4 tag objects by numeric IDs and exact names', () => {
  const tags = [
    { id: 23851250, name: 'ArcadeProfile: All Writing' },
    { id: 23851251, name: 'ArcadeProfile: Fiction' },
    { id: 23851252, name: 'ArcadeProfile: Essays' },
    { id: 23851253, name: 'ArcadeProfile: Lab' },
    { id: 23866437, name: 'ArcadeProfile: Queer Columns' },
    { id: 23806915, name: 'Interest: Work / AI' },
    { id: 23808390, name: 'TH4F' },
  ];
  assert.deepEqual(topicsFromKitTags(tags, true), ['all', 'fiction', 'essays', 'lab', 'queer-columns', 'work-ai', 'th4f']);
  assert.deepEqual(normalizeKitSubscriber({ email_address: 'reader@example.test', state: 'active', tags: [tags[5]], created_at: '2026-01-01T00:00:00Z' }), {
    email: 'reader@example.test', state: 'active', topics: ['work-ai'], created_at: '2026-01-01T00:00:00Z',
  });
});

test('active Kit subscribers fail export when a returned tag cannot be classified', () => {
  assert.throws(() => normalizeKitSubscriber({ email_address: 'reader@example.test', state: 'active', tags: [{ id: 999, name: 'Unknown' }] }), /unclassifiable tag/);
  assert.throws(() => normalizeKitSubscriber({ email_address: 'reader@example.test', state: 'active' }), /tags were not included/);
});

test('default-topic backfill rejects snapshots without confirmed tag coverage', () => {
  const active: KitExportSubscriber = { email: 'reader@example.test', state: 'active', topics: [], created_at: '' };
  const emptySnapshot = makeKitExportSnapshot([active], [], '2026-10-20T00:00:00Z');
  assert.equal(emptySnapshot.export_scope.tagged_subscriber_count, 0);
  assert.throws(() => assertSafeDefaultTopicBackfill(emptySnapshot), /tag coverage is missing/);

  const inconsistentSnapshot = { ...emptySnapshot, export_scope: { ...emptySnapshot.export_scope, tagged_subscriber_count: 4 } };
  assert.throws(() => assertSafeDefaultTopicBackfill(inconsistentSnapshot), /tag coverage is missing or inconsistent/);

  const suppressedTagOnly = makeKitExportSnapshot([
    active,
    { email: 'cancelled@example.test', state: 'cancelled', topics: ['work-ai'], created_at: '' } as KitExportSubscriber,
  ], [], '2026-10-20T00:00:00Z');
  assert.throws(() => assertSafeDefaultTopicBackfill(suppressedTagOnly), /tag coverage is missing or inconsistent/);
});

test('backfill requires tagged contact evidence, and unsubscribe sync requires a complete all-state snapshot', () => {
  const active: KitExportSubscriber = { email: 'active@example.test', state: 'active', topics: ['work-ai'], created_at: '' };
  const inactive: KitExportSubscriber = { email: 'inactive@example.test', state: 'inactive', topics: [], created_at: '' };
  const cancelled: KitExportSubscriber = { email: 'cancelled@example.test', state: 'cancelled', topics: [], created_at: '' };
  const bounced: KitExportSubscriber = { email: 'bounced@example.test', state: 'bounced', topics: [], created_at: '' };
  const snapshot = makeKitExportSnapshot([active, inactive, cancelled, bounced], [], '2026-10-20T00:00:00Z');
  assert.doesNotThrow(() => assertSafeDefaultTopicBackfill(snapshot));
  assert.doesNotThrow(() => assertCompleteKitSnapshotForUnsubscribeSync(snapshot));

  const activeOnly = makeKitExportSnapshot([active], [], '2026-10-20T00:00:00Z');
  assert.throws(() => assertCompleteKitSnapshotForUnsubscribeSync(activeOnly), /expected non-active states/);
  assert.throws(() => assertKitNonActiveStateCoverage(['active', 'inactive', 'bounced']), /expected non-active states/);
  assert.throws(() => assertCompleteKitSnapshotForUnsubscribeSync({ subscribers: [active] }), /fresh all-state/);
});
