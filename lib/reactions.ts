import type { Payload } from 'payload';

import { parsePositiveIntegerId } from '@/lib/positive-integer-id';
import { publicPostStatusWhere } from '@/lib/post-status';

export const REACTION_EMOJIS = ['🔥', '❤️', '😂', '😮', '👏', '🤔'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const REACTION_EMOJI_LABELS: Record<ReactionEmoji, string> = {
  '🔥': 'fire',
  '❤️': 'heart',
  '😂': 'laugh',
  '😮': 'shocked',
  '👏': 'applause',
  '🤔': 'thinking',
};

export interface ReactionsSnapshot {
  counts: Record<string, number>;
  mine: ReactionEmoji[];
}

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === 'string' && (REACTION_EMOJIS as readonly string[]).includes(value);
}

function emptyCounts(): Record<string, number> {
  return Object.fromEntries(REACTION_EMOJIS.map((e) => [e, 0]));
}

/**
 * Parse a post id from the URL param. Posts in this codebase use numeric
 * primary keys, so reject decimals, signs, hex, zero, and unsafe integers.
 */
export function parsePostId(value: string): number | null {
  return parsePositiveIntegerId(value);
}

/**
 * Confirms the post exists and is publicly visible. Mirrors the read-access filter in
 * collections/Posts.ts so reactions can't be planted on drafts/scheduled
 * posts via the public endpoint.
 */
export async function isPostPubliclyVisible(payload: Payload, postId: number): Promise<boolean> {
  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { id: { equals: postId } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length > 0;
}

export async function getReactionCounts(
  payload: Payload,
  postId: number,
): Promise<Record<string, number>> {
  const result = await payload.find({
    collection: 'post-reactions',
    where: { post: { equals: postId } },
    limit: 10_000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { emoji: true },
  });

  const counts = emptyCounts();
  for (const doc of result.docs) {
    const emoji = (doc as { emoji?: string }).emoji;
    if (isReactionEmoji(emoji)) counts[emoji] = (counts[emoji] ?? 0) + 1;
  }
  return counts;
}

async function findReactionId(
  payload: Payload,
  postId: number,
  emoji: ReactionEmoji,
  clientId: string,
): Promise<number | string | null> {
  const result = await payload.find({
    collection: 'post-reactions',
    where: {
      and: [
        { post: { equals: postId } },
        { emoji: { equals: emoji } },
        { clientId: { equals: clientId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs[0]?.id ?? null;
}

export async function getMyReactions(
  payload: Payload,
  postId: number,
  clientId: string,
): Promise<ReactionEmoji[]> {
  const result = await payload.find({
    collection: 'post-reactions',
    where: {
      and: [
        { post: { equals: postId } },
        { clientId: { equals: clientId } },
      ],
    },
    limit: REACTION_EMOJIS.length,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { emoji: true },
  });
  return result.docs
    .map((d) => (d as { emoji?: string }).emoji)
    .filter(isReactionEmoji);
}

export async function snapshotReactions(
  payload: Payload,
  postId: number,
  clientId: string | null,
): Promise<ReactionsSnapshot> {
  const [counts, mine] = await Promise.all([
    getReactionCounts(payload, postId),
    clientId ? getMyReactions(payload, postId, clientId) : Promise.resolve<ReactionEmoji[]>([]),
  ]);
  return { counts, mine };
}

export interface ToggleResult {
  /** What happened — useful for logging and tests. */
  action: 'added' | 'removed';
  snapshot: ReactionsSnapshot;
}

/**
 * Toggles a single (post, emoji, clientId) reaction. If the row exists, it's
 * removed; otherwise it's inserted. Returns the post's full reaction snapshot
 * from this client's point of view.
 */
export async function toggleReaction(
  payload: Payload,
  args: { postId: number; emoji: ReactionEmoji; clientId: string },
): Promise<ToggleResult> {
  const { postId, emoji, clientId } = args;
  const existingId = await findReactionId(payload, postId, emoji, clientId);

  let action: ToggleResult['action'];
  if (existingId !== null) {
    await payload.delete({
      collection: 'post-reactions',
      id: existingId,
      overrideAccess: true,
    });
    action = 'removed';
  } else {
    await payload.create({
      collection: 'post-reactions',
      data: { post: postId, emoji, clientId },
      overrideAccess: true,
    });
    action = 'added';
  }

  const snapshot = await snapshotReactions(payload, postId, clientId);
  return { action, snapshot };
}
