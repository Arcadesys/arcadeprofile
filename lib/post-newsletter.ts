import type { Payload } from 'payload';

import type { Post } from '@/payload-types';
import { computePostPartIndex } from './post-url';

export type GroupHero = {
  /** Group slug — used by `buildPostNewsletterContent` to build /projects/<slug>/<part> URLs. */
  slug?: string | null;
  image?: string | null;
  title?: string | null;
  /** 1-based index of the post within its group (intro is 0; first post is 1). */
  partIndex?: number | null;
};

/**
 * Loads the post's group (by slug) and returns just the fields the email
 * renderer needs. Returns null when the post has no group or the group
 * lookup yields no match. The group's `image` is a plain text URL today,
 * so depth: 0 is intentional.
 *
 * Also computes the post's 1-based position within its group's published
 * posts (sorted by `order` then `publishedDate`), so the renderer can build
 * the canonical /projects/<group>/<part> permalink.
 */
export async function resolveGroupHeroForPost(
  payload: Payload,
  post: Pick<Post, 'slug' | 'group'>,
): Promise<GroupHero | null> {
  const groupSlug = typeof post.group === 'string' ? post.group.trim() : '';
  if (!groupSlug) return null;

  const result = await payload.find({
    collection: 'groups',
    where: { slug: { equals: groupSlug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  const found = result.docs[0] as { image?: string | null; title?: string | null } | undefined;
  if (!found) return null;

  const partIndex = await computePostPartIndex(payload, post.slug, groupSlug);

  return {
    slug: groupSlug,
    image: found.image ?? null,
    title: found.title ?? null,
    partIndex,
  };
}
