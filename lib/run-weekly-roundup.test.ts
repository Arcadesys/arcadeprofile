import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeRoundupWindow, runWeeklyRoundup } from './run-weekly-roundup';
import type { Payload } from 'payload';
import type {
  PostNewsletterFanOutInput,
  PostNewsletterFanOutResult,
} from './post-newsletter-fanout';

type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  publishedDate: string;
  publish_status: 'published' | 'sent';
  group: string | null;
};

type GroupRow = {
  id: number;
  slug: string;
  title: string;
  category: string | null;
};

type FindArgs = {
  collection: string;
  where?: {
    slug?: { equals?: string };
    and?: Array<{
      publishedDate?: { greater_than_equal?: string; less_than_equal?: string };
    }>;
  };
};

function makePayload(opts: { posts: PostRow[]; groups: GroupRow[] }): Payload {
  const find = async (args: FindArgs) => {
    const collection = args.collection;
    if (collection === 'groups') {
      // The runner queries /groups twice: once unfiltered for the category map,
      // and once per fiction post for the hero/title block.
      const slugEq = args.where?.slug?.equals;
      if (slugEq) {
        const docs = opts.groups.filter((g) => g.slug === slugEq);
        return { docs, totalDocs: docs.length };
      }
      return { docs: opts.groups, totalDocs: opts.groups.length };
    }
    if (collection === 'posts') {
      // Roundup window query uses publish_status `in` + publishedDate range.
      // Reuse the same posts list — the test seeds posts already in window.
      let docs = opts.posts;
      const clauses = args.where?.and ?? [];
      for (const clause of clauses) {
        const gte = clause.publishedDate?.greater_than_equal;
        if (gte) {
          const t = new Date(gte).getTime();
          docs = docs.filter((p) => new Date(p.publishedDate).getTime() >= t);
        }
        const lte = clause.publishedDate?.less_than_equal;
        if (lte) {
          const t = new Date(lte).getTime();
          docs = docs.filter((p) => new Date(p.publishedDate).getTime() <= t);
        }
      }
      return { docs, totalDocs: docs.length };
    }
    throw new Error(`unmocked collection: ${collection}`);
  };

  return { find: find as unknown as Payload['find'] } as unknown as Payload;
}

function makeRecordingFanOut(): {
  calls: PostNewsletterFanOutInput[];
  send: (input: PostNewsletterFanOutInput) => Promise<PostNewsletterFanOutResult>;
} {
  const calls: PostNewsletterFanOutInput[] = [];
  return {
    calls,
    send: async (input) => {
      calls.push(input);
      const audiences =
        input.groupCategory === 'fiction' ? ['fiction', 'all'] as const : ['essays', 'all'] as const;
      return {
        audiences: [...audiences],
        results: audiences.map((a) => ({ audience: a, messageId: `m-${a}`, campaignId: `c-${a}` })),
        failures: [],
        allSucceeded: true,
      };
    },
  };
}

test('computeRoundupWindow: trailing 7 days ends at now', () => {
  const now = new Date('2026-05-08T13:00:00Z');
  const { weekStart, weekEnd } = computeRoundupWindow(now);
  assert.equal(weekEnd.toISOString(), now.toISOString());
  assert.equal(weekStart.toISOString(), '2026-05-01T13:00:00.000Z');
});

test('runWeeklyRoundup: splits fiction vs non-fiction by Group.category and sends both', async () => {
  const payload = makePayload({
    groups: [
      { id: 1, slug: 'la-ligne', title: 'La Ligne', category: 'fiction' },
      { id: 2, slug: 'on-writing', title: 'On Writing', category: 'writing' },
    ],
    posts: [
      {
        id: 10, slug: 'fic-1', title: 'Fic 1', excerpt: 'a', publishedDate: '2026-05-05T10:00:00Z',
        publish_status: 'published', group: 'la-ligne',
      },
      {
        id: 11, slug: 'fic-2', title: 'Fic 2', excerpt: 'b', publishedDate: '2026-05-06T10:00:00Z',
        publish_status: 'published', group: 'la-ligne',
      },
      {
        id: 20, slug: 'essay-1', title: 'Essay 1', excerpt: 'c', publishedDate: '2026-05-07T10:00:00Z',
        publish_status: 'published', group: 'on-writing',
      },
    ],
  });

  const fanOut = makeRecordingFanOut();
  const summary = await runWeeklyRoundup(payload, {
    now: new Date('2026-05-08T13:00:00Z'),
    sendFanOut: fanOut.send,
  });

  assert.equal(summary.allSucceeded, true);
  assert.equal(summary.streams.length, 2);
  assert.equal(fanOut.calls.length, 2, 'expected one fan-out call per stream');

  const byCategory = new Map(fanOut.calls.map((c) => [c.groupCategory, c]));
  const fictionCall = byCategory.get('fiction');
  const essayCall = byCategory.get('writing');
  assert.ok(fictionCall, 'expected a fiction fan-out call');
  assert.ok(essayCall, 'expected an essay fan-out call');

  // Each digest contains its own posts only.
  assert.ok(fictionCall.htmlBody.includes('Fic 1'));
  assert.ok(fictionCall.htmlBody.includes('Fic 2'));
  assert.ok(!fictionCall.htmlBody.includes('Essay 1'));
  assert.ok(essayCall.htmlBody.includes('Essay 1'));
  assert.ok(!essayCall.htmlBody.includes('Fic 1'));

  // Slug is stream + ISO date for AC dashboard readability.
  assert.match(fictionCall.slug, /^weekly-fiction-2026-05-08$/);
  assert.match(essayCall.slug, /^weekly-essays-2026-05-08$/);
});

test('runWeeklyRoundup: stream with zero posts is skipped, not sent as an empty digest', async () => {
  const payload = makePayload({
    groups: [{ id: 1, slug: 'la-ligne', title: 'La Ligne', category: 'fiction' }],
    posts: [
      {
        id: 10, slug: 'fic-1', title: 'Fic 1', publishedDate: '2026-05-06T10:00:00Z',
        publish_status: 'published', group: 'la-ligne',
      },
    ],
  });
  const fanOut = makeRecordingFanOut();
  const summary = await runWeeklyRoundup(payload, {
    now: new Date('2026-05-08T13:00:00Z'),
    sendFanOut: fanOut.send,
  });

  assert.equal(fanOut.calls.length, 1, 'only fiction should send');
  const fictionStream = summary.streams.find((s) => s.stream === 'fiction')!;
  const essaysStream = summary.streams.find((s) => s.stream === 'essays')!;
  assert.equal(fictionStream.skipped, false);
  assert.equal(fictionStream.postCount, 1);
  assert.equal(essaysStream.skipped, true);
  assert.equal(essaysStream.postCount, 0);
});

test('runWeeklyRoundup: posts outside the window are excluded', async () => {
  const payload = makePayload({
    groups: [{ id: 1, slug: 'g', title: 'G', category: 'writing' }],
    posts: [
      {
        id: 1, slug: 'old', title: 'Old', publishedDate: '2026-04-15T10:00:00Z',
        publish_status: 'published', group: 'g',
      },
      {
        id: 2, slug: 'new', title: 'New', publishedDate: '2026-05-06T10:00:00Z',
        publish_status: 'published', group: 'g',
      },
    ],
  });
  const fanOut = makeRecordingFanOut();
  await runWeeklyRoundup(payload, {
    now: new Date('2026-05-08T13:00:00Z'),
    sendFanOut: fanOut.send,
  });
  const essayCall = fanOut.calls[0];
  assert.ok(essayCall.htmlBody.includes('New'));
  assert.ok(!essayCall.htmlBody.includes('Old'));
});

test('runWeeklyRoundup: ungrouped post falls into essays stream', async () => {
  const payload = makePayload({
    groups: [],
    posts: [
      {
        id: 1, slug: 'lone', title: 'Lone', publishedDate: '2026-05-06T10:00:00Z',
        publish_status: 'published', group: null,
      },
    ],
  });
  const fanOut = makeRecordingFanOut();
  await runWeeklyRoundup(payload, {
    now: new Date('2026-05-08T13:00:00Z'),
    sendFanOut: fanOut.send,
  });
  assert.equal(fanOut.calls.length, 1);
  assert.equal(fanOut.calls[0].groupCategory, 'writing');
});

test('runWeeklyRoundup: surfaces fan-out failures via allSucceeded=false', async () => {
  const payload = makePayload({
    groups: [{ id: 1, slug: 'g', title: 'G', category: 'fiction' }],
    posts: [
      {
        id: 1, slug: 'fic', title: 'Fic', publishedDate: '2026-05-06T10:00:00Z',
        publish_status: 'published', group: 'g',
      },
    ],
  });

  const sendFanOut: typeof import('./post-newsletter-fanout').sendPostNewsletterFanOut =
    async () => ({
      audiences: ['fiction', 'all'],
      results: [{ audience: 'all', messageId: 'm', campaignId: 'c' }],
      failures: [{ audience: 'fiction', error: new Error('boom') }],
      allSucceeded: false,
    });

  const summary = await runWeeklyRoundup(payload, {
    now: new Date('2026-05-08T13:00:00Z'),
    sendFanOut,
  });

  assert.equal(summary.allSucceeded, false);
});
