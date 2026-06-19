import assert from 'node:assert/strict';
import test from 'node:test';

import { computePostPartIndex, parsePostPartSegment, resolvePostSlugByPartIndex } from './post-url';

type PostUrlPayload = Parameters<typeof computePostPartIndex>[0];

function makePayload(docs: Array<{ slug: string; group: string; order?: number | null; publishedDate?: string }>) {
  return {
    async find() {
      // Deliberately return rows in database/fixture order; the helpers must
      // normalize with the shared group-order comparator before indexing.
      return { docs };
    },
  } as unknown as PostUrlPayload;
}

function makeCapturingPayload(
  docs: Array<{ slug: string; group: string; order?: number | null; publishedDate?: string }>,
) {
  const calls: unknown[] = [];
  const payload = {
    async find(args: unknown) {
      calls.push(args);
      return { docs };
    },
  } as unknown as PostUrlPayload;
  return { payload, calls };
}

test('computePostPartIndex uses shared group ordering for null order values', async () => {
  const payload = makePayload([
    { slug: 'unordered-late', group: 'g', order: null, publishedDate: '2026-01-03' },
    { slug: 'second', group: 'g', order: 2, publishedDate: '2026-01-01' },
    { slug: 'first', group: 'g', order: 1, publishedDate: '2026-01-02' },
  ]);

  assert.equal(await computePostPartIndex(payload, 'first', 'g'), 1);
  assert.equal(await computePostPartIndex(payload, 'second', 'g'), 2);
  assert.equal(await computePostPartIndex(payload, 'unordered-late', 'g'), 3);
});

test('resolvePostSlugByPartIndex uses shared group ordering for numeric redirects', async () => {
  const payload = makePayload([
    { slug: 'unordered-late', group: 'g', order: null, publishedDate: '2026-01-03' },
    { slug: 'second', group: 'g', order: 2, publishedDate: '2026-01-01' },
    { slug: 'first', group: 'g', order: 1, publishedDate: '2026-01-02' },
  ]);

  assert.equal(await resolvePostSlugByPartIndex(payload, 'g', 1), 'first');
  assert.equal(await resolvePostSlugByPartIndex(payload, 'g', 2), 'second');
  assert.equal(await resolvePostSlugByPartIndex(payload, 'g', 3), 'unordered-late');
});

test('post part helpers load every published group post without a fixed cap', async () => {
  const docs = Array.from({ length: 250 }, (_, i) => ({
    slug: `part-${i + 1}`,
    group: 'g',
    order: i + 1,
    publishedDate: '2026-01-01',
  }));
  const { payload, calls } = makeCapturingPayload(docs);

  assert.equal(await computePostPartIndex(payload, 'part-250', 'g'), 250);
  assert.equal(await resolvePostSlugByPartIndex(payload, 'g', 250), 'part-250');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal((call as { pagination?: unknown }).pagination, false);
    assert.equal('limit' in (call as Record<string, unknown>), false);
  }
});

test('parsePostPartSegment accepts padded legacy parts but rejects unsafe integers', () => {
  assert.equal(parsePostPartSegment('0'), 0);
  assert.equal(parsePostPartSegment('01'), 1);
  assert.equal(parsePostPartSegment('12'), 12);
  assert.equal(parsePostPartSegment(''), null);
  assert.equal(parsePostPartSegment('12abc'), null);
  assert.equal(parsePostPartSegment('9007199254740993'), null);
});
