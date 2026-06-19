import type { Payload } from 'payload';

import { comparePostsByGroupOrder } from './post-order';
import { publicPostStatusWhere } from './post-status';

const NUMERIC_PART_SEGMENT_RE = /^\d+$/;

export function partNum(n: number): string {
  return String(n).padStart(2, '0');
}

export function parsePostPartSegment(segment: string): number | null {
  if (!NUMERIC_PART_SEGMENT_RE.test(segment)) return null;
  const parsed = Number(segment);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Canonical permalink for a post within its group: /projects/<group>/<post-slug>. */
export function buildPostUrl(groupSlug: string, postSlug: string): string {
  return `/projects/${groupSlug}/${postSlug}`;
}

/** Canonical permalink for a group's intro page: /projects/<group>. */
export function buildGroupIntroUrl(groupSlug: string): string {
  return `/projects/${groupSlug}`;
}

/**
 * Resolve a post slug to its canonical { groupSlug, partIndex, url }.
 * Returns null if the post is missing, unpublished, or has no group.
 * `partIndex` is the 1-based position within the group (intro is 0) — kept
 * for callers that still render part numbering, even though it's no longer
 * part of the URL.
 */
export async function getPostLocationBySlug(
  payload: Payload,
  postSlug: string,
): Promise<{ groupSlug: string; partIndex: number; url: string } | null> {
  if (!postSlug) return null;
  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { slug: { equals: postSlug } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const post = result.docs[0];
  const groupSlug = post?.group as string | undefined;
  if (!groupSlug) return null;
  const partIndex = await computePostPartIndex(payload, postSlug, groupSlug);
  if (partIndex === null) return null;
  return { groupSlug, partIndex, url: buildPostUrl(groupSlug, postSlug) };
}

/**
 * 1-based part index for a post within its group's published list (intro is
 * 0; the first post is 1). Returns null when the post can't be located in
 * the group. Sorts with the same JS helper used by public group rendering so
 * null `order` values and date tie-breakers behave consistently across pages,
 * email content, and the numeric → slug redirect.
 */
export async function computePostPartIndex(
  payload: Payload,
  postSlug: string,
  groupSlug: string,
): Promise<number | null> {
  if (!groupSlug || !postSlug) return null;
  const siblings = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { group: { equals: groupSlug } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    sort: ['order', 'publishedDate'],
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  const ordered = [...siblings.docs].sort(comparePostsByGroupOrder);
  const idx = ordered.findIndex((p) => (p.slug as string) === postSlug);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Resolve a 1-based part index within a group to its post slug. Index 0 is
 * the intro (returns null — caller should redirect to the group's intro URL).
 * Returns null when the index is out of range. Used to translate legacy
 * numeric URLs into the slug-based canonical form.
 */
export async function resolvePostSlugByPartIndex(
  payload: Payload,
  groupSlug: string,
  partIndex: number,
): Promise<string | null> {
  if (!groupSlug || partIndex < 1) return null;
  const siblings = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { group: { equals: groupSlug } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    sort: ['order', 'publishedDate'],
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  const ordered = [...siblings.docs].sort(comparePostsByGroupOrder);
  const post = ordered[partIndex - 1];
  return (post?.slug as string | undefined) ?? null;
}
