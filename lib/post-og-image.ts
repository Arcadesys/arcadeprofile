import type { Payload, Where } from 'payload';

import type { Group, Media, Post } from '@/payload-types';

export interface OgImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Where the image came from, for logging/debugging. */
  source: 'post' | 'chapter-sibling' | 'group';
}

/**
 * Pick the OG-sized URL when available, falling back to the original.
 * Payload's `og` size is configured at 1200x630 in the Media collection.
 */
function pickOgUrl(media: Media): { url: string; width?: number; height?: number } | null {
  const og = media.sizes?.og;
  if (og?.url) {
    return {
      url: og.url,
      width: og.width ?? undefined,
      height: og.height ?? undefined,
    };
  }
  if (media.url) {
    return {
      url: media.url,
      width: media.width ?? undefined,
      height: media.height ?? undefined,
    };
  }
  return null;
}

function fromMedia(media: Media | null | undefined, source: OgImage['source']): OgImage | null {
  if (!media) return null;
  const picked = pickOgUrl(media);
  if (!picked) return null;
  return {
    ...picked,
    alt: media.alt ?? undefined,
    source,
  };
}

async function loadMediaById(payload: Payload, id: number): Promise<Media | null> {
  try {
    return (await payload.findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: true,
    })) as Media;
  } catch {
    return null;
  }
}

async function resolveMediaRef(
  payload: Payload,
  ref: number | Media | null | undefined,
): Promise<Media | null> {
  if (ref == null) return null;
  if (typeof ref === 'object') return ref;
  return loadMediaById(payload, ref);
}

/**
 * Find the first sibling post in the same chapter (or just the same group, if
 * the post has no chapter) that has a `meta.image`. Sorted by `order` then
 * `publishedDate` so results are stable.
 */
async function findChapterSiblingImage(
  payload: Payload,
  post: Pick<Post, 'id' | 'group' | 'chapter'>,
): Promise<OgImage | null> {
  if (!post.group) return null;

  const where: Where = {
    group: { equals: post.group },
    'meta.image': { exists: true },
    id: { not_equals: post.id },
  };
  if (post.chapter) {
    where.chapter = { equals: post.chapter };
  }

  const result = await payload.find({
    collection: 'posts',
    where,
    sort: ['order', 'publishedDate'],
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  const sibling = result.docs[0] as Post | undefined;
  if (!sibling?.meta?.image) return null;

  const media = await resolveMediaRef(payload, sibling.meta.image);
  return fromMedia(media, 'chapter-sibling');
}

async function findGroupImage(payload: Payload, groupSlug: string): Promise<OgImage | null> {
  const result = await payload.find({
    collection: 'groups',
    where: { slug: { equals: groupSlug } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const group = result.docs[0] as Group | undefined;
  if (!group) return null;

  const metaImg = await resolveMediaRef(payload, group.meta?.image);
  const fromMeta = fromMedia(metaImg, 'group');
  if (fromMeta) return fromMeta;

  const heroImg = await resolveMediaRef(payload, group.image);
  return fromMedia(heroImg, 'group');
}

/**
 * Resolve the meta/OG image for a post, falling back from post → sibling
 * post in the same chapter → group hero.
 *
 * Pass a post that's already been loaded with depth >= 1 to avoid an extra
 * round-trip when `post.meta.image` is the only thing you need.
 */
export async function resolvePostOgImage(
  payload: Payload,
  post: Pick<Post, 'id' | 'group' | 'chapter' | 'meta'>,
): Promise<OgImage | null> {
  const own = await resolveMediaRef(payload, post.meta?.image);
  const fromOwn = fromMedia(own, 'post');
  if (fromOwn) return fromOwn;

  const sibling = await findChapterSiblingImage(payload, post);
  if (sibling) return sibling;

  if (post.group) {
    return findGroupImage(payload, post.group);
  }

  return null;
}

/**
 * Convenience wrapper that loads a post by slug then resolves its OG image.
 */
export async function resolvePostOgImageBySlug(
  payload: Payload,
  slug: string,
): Promise<OgImage | null> {
  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const post = result.docs[0] as Post | undefined;
  if (!post) return null;
  return resolvePostOgImage(payload, post);
}
