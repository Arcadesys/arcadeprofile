import assert from 'node:assert/strict';
import test from 'node:test';

import { computePostPartIndex, resolvePostSlugByPartIndex } from './post-url';

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
