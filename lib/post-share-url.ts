import type { Payload } from 'payload';

import { buildPostUrl, computePostPartIndex } from '@/lib/post-url';
// `computePostPartIndex` is still used as a presence check — a post with a
// group but no resolvable position in the published list is treated as
// not-shareable, same as before.
import type { ShareUrlResponse } from '@/lib/post-share-url-types';
import type { Post } from '@/payload-types';

const DEFAULT_SITE_URL = 'https://thearcades.me';

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
}

export async function resolvePostShareUrl(
  payload: Payload,
  id: number | string,
): Promise<ShareUrlResponse> {
  let post: Post;
  try {
    post = (await payload.findByID({
      collection: 'posts',
      id,
      depth: 0,
      overrideAccess: true,
    })) as Post;
  } catch {
    return { url: null, absoluteUrl: null, reason: 'not-found' };
  }

  if (post.publish_status !== 'published' && post.publish_status !== 'sent') {
    return { url: null, absoluteUrl: null, reason: 'draft' };
  }

  const slug = post.slug;
  if (!slug) {
    return { url: null, absoluteUrl: null, reason: 'no-slug' };
  }

  const groupSlug = post.group;
  if (!groupSlug) {
    return { url: null, absoluteUrl: null, reason: 'no-group' };
  }

  const partIndex = await computePostPartIndex(payload, slug, groupSlug);
  if (partIndex === null) {
    return { url: null, absoluteUrl: null, reason: 'not-found' };
  }

  const url = buildPostUrl(groupSlug, slug);
  return { url, absoluteUrl: `${siteUrl()}${url}` };
}
