import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Payload } from 'payload';

import {
  REACTION_EMOJIS,
  getMyReactions,
  getReactionCounts,
  isPostPubliclyVisible,
  isReactionEmoji,
  parsePostId,
  snapshotReactions,
  toggleReaction,
} from './reactions';

interface Post {
  id: number;
  publish_status: 'draft' | 'scheduled' | 'published' | 'sent';
}

interface Reaction {
  id: number;
  post: number;
  emoji: string;
  clientId: string;
}

interface WhereClause {
  and?: Array<{
    [key: string]: { equals?: unknown; in?: unknown[] };
  }>;
  [key: string]: unknown;
}

function matches(doc: Record<string, unknown>, where: WhereClause | undefined): boolean {
  if (!where) return true;
  const conditions = where.and ?? [where];
  for (const cond of conditions) {
    for (const [field, op] of Object.entries(cond)) {
      if (field === 'and') continue;
      const opObj = op as { equals?: unknown; in?: unknown[] };
      const value = doc[field];
      if ('equals' in opObj && opObj.equals !== undefined) {
        if (value !== opObj.equals) return false;
      }
      if ('in' in opObj && Array.isArray(opObj.in)) {
        if (!opObj.in.includes(value)) return false;
      }
    }
  }
  return true;
}

function makeFakePayload(initial: {
  posts?: Post[];
  reactions?: Reaction[];
} = {}): { payload: Payload; posts: Post[]; reactions: Reaction[] } {
  const posts: Post[] = [...(initial.posts ?? [])];
  const reactions: Reaction[] = [...(initial.reactions ?? [])];
  let nextReactionId = (reactions.at(-1)?.id ?? 0) + 1;

  const payload = {
    find: async (args: {
      collection: string;
      where?: WhereClause;
      limit?: number;
    }) => {
      const source =
        args.collection === 'posts'
          ? (posts as unknown as Record<string, unknown>[])
          : args.collection === 'post-reactions'
            ? (reactions as unknown as Record<string, unknown>[])
            : [];
      const filtered = source.filter((d) => matches(d, args.where));
      const limited = args.limit ? filtered.slice(0, args.limit) : filtered;
      return { docs: limited, totalDocs: filtered.length };
    },
    create: async (args: { collection: string; data: Omit<Reaction, 'id'> }) => {
      if (args.collection !== 'post-reactions') throw new Error('unsupported');
      const row: Reaction = { id: nextReactionId++, ...args.data };
      reactions.push(row);
      return row;
    },
    delete: async (args: { collection: string; id: number | string }) => {
      if (args.collection !== 'post-reactions') throw new Error('unsupported');
      const idx = reactions.findIndex((r) => r.id === args.id);
      if (idx < 0) throw new Error('not found');
      const [removed] = reactions.splice(idx, 1);
      return removed;
    },
  } as unknown as Payload;

  return { payload, posts, reactions };
}

test('isReactionEmoji accepts the curated set and rejects everything else', () => {
  for (const emoji of REACTION_EMOJIS) assert.ok(isReactionEmoji(emoji));
  assert.ok(!isReactionEmoji('💩'));
  assert.ok(!isReactionEmoji(''));
  assert.ok(!isReactionEmoji(null));
  assert.ok(!isReactionEmoji(undefined));
  assert.ok(!isReactionEmoji(42));
});

test('parsePostId rejects non-integers, coercions, zero, negatives, and junk', () => {
  assert.equal(parsePostId('1'), 1);
  assert.equal(parsePostId('42'), 42);
  assert.equal(parsePostId('0'), null);
  assert.equal(parsePostId('-3'), null);
  assert.equal(parsePostId('1.5'), null);
  assert.equal(parsePostId('0x10'), null);
  assert.equal(parsePostId('1e3'), null);
  assert.equal(parsePostId(String(Number.MAX_SAFE_INTEGER + 1)), null);
  assert.equal(parsePostId('abc'), null);
  assert.equal(parsePostId(''), null);
});

test('isPostPubliclyVisible is true for published/sent and false for draft/scheduled/missing', async () => {
  const { payload } = makeFakePayload({
    posts: [
      { id: 1, publish_status: 'published' },
      { id: 2, publish_status: 'sent' },
      { id: 3, publish_status: 'draft' },
      { id: 4, publish_status: 'scheduled' },
    ],
  });
  assert.equal(await isPostPubliclyVisible(payload, 1), true);
  assert.equal(await isPostPubliclyVisible(payload, 2), true);
  assert.equal(await isPostPubliclyVisible(payload, 3), false);
  assert.equal(await isPostPubliclyVisible(payload, 4), false);
  assert.equal(await isPostPubliclyVisible(payload, 999), false);
});

test('getReactionCounts returns zeroed entries when there are no reactions', async () => {
  const { payload } = makeFakePayload();
  const counts = await getReactionCounts(payload, 1);
  for (const e of REACTION_EMOJIS) assert.equal(counts[e], 0);
});

test('getReactionCounts groups by emoji and scopes by postId', async () => {
  const { payload } = makeFakePayload({
    reactions: [
      { id: 1, post: 1, emoji: '🔥', clientId: 'a' },
      { id: 2, post: 1, emoji: '🔥', clientId: 'b' },
      { id: 3, post: 1, emoji: '❤️', clientId: 'a' },
      { id: 4, post: 2, emoji: '🔥', clientId: 'a' },
    ],
  });
  const counts1 = await getReactionCounts(payload, 1);
  assert.equal(counts1['🔥'], 2);
  assert.equal(counts1['❤️'], 1);
  assert.equal(counts1['😂'], 0);

  const counts2 = await getReactionCounts(payload, 2);
  assert.equal(counts2['🔥'], 1);
  assert.equal(counts2['❤️'], 0);
});

test('getMyReactions returns only the emojis this clientId has reacted with', async () => {
  const { payload } = makeFakePayload({
    reactions: [
      { id: 1, post: 1, emoji: '🔥', clientId: 'a' },
      { id: 2, post: 1, emoji: '❤️', clientId: 'a' },
      { id: 3, post: 1, emoji: '🔥', clientId: 'b' },
    ],
  });
  const mineA = await getMyReactions(payload, 1, 'a');
  assert.deepEqual([...mineA].sort(), ['❤️', '🔥']);
  const mineB = await getMyReactions(payload, 1, 'b');
  assert.deepEqual(mineB, ['🔥']);
  const mineC = await getMyReactions(payload, 1, 'c');
  assert.deepEqual(mineC, []);
});

test('toggleReaction: adds when missing, removes when present (toggle round-trip)', async () => {
  const { payload, reactions } = makeFakePayload();

  const added = await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'a' });
  assert.equal(added.action, 'added');
  assert.equal(reactions.length, 1);
  assert.equal(added.snapshot.counts['🔥'], 1);
  assert.deepEqual(added.snapshot.mine, ['🔥']);

  const removed = await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'a' });
  assert.equal(removed.action, 'removed');
  assert.equal(reactions.length, 0);
  assert.equal(removed.snapshot.counts['🔥'], 0);
  assert.deepEqual(removed.snapshot.mine, []);

  const readded = await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'a' });
  assert.equal(readded.action, 'added');
  assert.equal(reactions.length, 1);
});

test('toggleReaction: different clients on the same emoji stack independently', async () => {
  const { payload, reactions } = makeFakePayload();
  await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'a' });
  await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'b' });
  await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'c' });
  assert.equal(reactions.length, 3);

  const counts = await getReactionCounts(payload, 1);
  assert.equal(counts['🔥'], 3);

  await toggleReaction(payload, { postId: 1, emoji: '🔥', clientId: 'b' });
  const after = await getReactionCounts(payload, 1);
  assert.equal(after['🔥'], 2);
});

test('snapshotReactions with null clientId omits the `mine` lookup but still returns counts', async () => {
  const { payload } = makeFakePayload({
    reactions: [{ id: 1, post: 1, emoji: '🔥', clientId: 'a' }],
  });
  const snap = await snapshotReactions(payload, 1, null);
  assert.equal(snap.counts['🔥'], 1);
  assert.deepEqual(snap.mine, []);
});
