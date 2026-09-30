import { buildPostDiscoveryUrl } from '@/lib/post-canonical';
import type { BlogPost, PostLocation } from './blog';

export interface RelatedPost {
  slug: string;
  title: string;
  groupSlug: string;
  groupTitle: string;
  date: string;
  href: string;
}

/**
 * Cross-series "read next" suggestions for a post. Posts in the same group
 * as `current` are excluded — those are already reachable via prev/next
 * chapter nav, so this is purely for discovery outside the current series.
 * Scored by shared-tag overlap (desc), tiebroken by recency (desc); when tag
 * overlap doesn't fill `limit`, backfills with the most recent posts from
 * other groups.
 */
export function getRelatedPosts(
  allPosts: BlogPost[],
  current: BlogPost,
  urlMap: Map<string, PostLocation>,
  limit = 3,
): RelatedPost[] {
  const currentGroupSlug = urlMap.get(current.slug)?.groupSlug ?? current.group;
  const currentTags = new Set(current.tags);

  const candidates = allPosts.filter((post) => {
    if (post.slug === current.slug) return false;
    const groupSlug = urlMap.get(post.slug)?.groupSlug ?? post.group;
    if (!groupSlug || groupSlug === currentGroupSlug) return false;
    return true;
  });

  const scored = candidates
    .map((post) => ({
      post,
      overlap: post.tags.filter((tag) => currentTags.has(tag)).length,
      dateMs: new Date(post.date).getTime(),
    }))
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return b.dateMs - a.dateMs;
    });

  const related: RelatedPost[] = [];
  for (const { post } of scored) {
    if (related.length >= limit) break;
    const loc = urlMap.get(post.slug);
    if (!loc) continue;
    related.push({
      slug: post.slug,
      title: post.title,
      groupSlug: loc.groupSlug,
      groupTitle: loc.groupTitle,
      date: post.date,
      href: buildPostDiscoveryUrl(loc.groupSlug, post.slug),
    });
  }
  return related;
}
