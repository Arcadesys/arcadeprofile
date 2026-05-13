import type { Payload } from 'payload';

import type { Group, Post } from '@/payload-types';
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
 * lookup yields no match. The group's `image` is an upload (relation to
 * `media`), so we populate it at depth: 1 and extract `.url` — passing the
 * raw media id through to the renderer would crash `String#trim` on it.
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
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });
  const found = result.docs[0] as Group | undefined;
  if (!found) return null;

  // Group.image is `(number | null) | Media`. After depth: 1 it's the
  // populated Media doc; a bare number means the upload was unresolvable.
  const imageUrl =
    found.image && typeof found.image === 'object' && typeof found.image.url === 'string'
      ? found.image.url
      : null;

  const partIndex = await computePostPartIndex(payload, post.slug, groupSlug);

  return {
    slug: groupSlug,
    image: imageUrl,
    title: found.title ?? null,
    partIndex,
  };
}
