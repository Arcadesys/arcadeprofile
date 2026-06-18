import type { Payload } from 'payload';

import type { Group, Post } from '@/payload-types';

export type GroupHero = {
  /** Group slug — used by `buildPostNewsletterContent` to build
   * /projects/<group>/<post-slug> URLs. */
  slug?: string | null;
  image?: string | null;
  title?: string | null;
};

/**
 * Loads the post's group (by slug) and returns just the fields the email
 * renderer needs. Returns null when the post has no group or the group
 * lookup yields no match. The group's `image` is an upload (relation to
 * `media`), so we populate it at depth: 1 and extract `.url` — passing the
 * raw media id through to the renderer would crash `String#trim` on it.
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

  return {
    slug: groupSlug,
    image: imageUrl,
    title: found.title ?? null,
  };
}
