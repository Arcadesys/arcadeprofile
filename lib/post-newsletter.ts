import type { Payload } from 'payload';

import type { Post } from '@/payload-types';

export type GroupHero = {
  image?: string | null;
  title?: string | null;
};

/**
 * Loads the post's group (by slug) and returns just the fields the email
 * renderer needs. Returns null when the post has no group or the group
 * lookup yields no match. The group's `image` is a plain text URL today,
 * so depth: 0 is intentional.
 */
export async function resolveGroupHeroForPost(
  payload: Payload,
  post: Pick<Post, 'group'>,
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
  return { image: found.image ?? null, title: found.title ?? null };
}
