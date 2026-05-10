import type { Payload } from 'payload';

export function partNum(n: number): string {
  return String(n).padStart(2, '0');
}

/** Canonical permalink for a post within its group: /projects/<group>/<part>. */
export function buildPostUrl(groupSlug: string, partIndex: number): string {
  return `/projects/${groupSlug}/${partNum(partIndex)}`;
}

/**
 * Resolve a post slug to its canonical { groupSlug, partIndex, url }.
 * Returns null if the post is missing, unpublished, or has no group.
 * Two targeted queries (one for the post, one for siblings) — does not
 * fetch every group's posts the way `buildPostUrlMap` does.
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
        { publish_status: { in: ['published', 'sent'] } },
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
  return { groupSlug, partIndex, url: buildPostUrl(groupSlug, partIndex) };
}

/**
 * 1-based part index for a post within its group's published list (intro is
 * 0; the first post is 01). Returns null when the post can't be located in
 * the group. Uses the database's multi-key sort so the index matches what
 * `getAllGroups` and `app/(frontend)/projects/[slug]/[part]/page.tsx`
 * compute at render time.
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
        { publish_status: { in: ['published', 'sent'] } },
      ],
    },
    sort: ['order', 'publishedDate'],
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  const idx = siblings.docs.findIndex((p) => (p.slug as string) === postSlug);
  return idx >= 0 ? idx + 1 : null;
}
