import type { BlogPost, Group } from '@/lib/blog';

export interface PostWithIndex {
  post: BlogPost;
  /** 1-based global position among the group's posts. */
  partIndex: number;
}

export interface ChapterSection {
  /** Chapter slug, or null for posts not assigned to a chapter. */
  slug: string | null;
  /** Chapter title, or null for the unassigned bucket. */
  title: string | null;
  posts: PostWithIndex[];
}

/**
 * Group a serial's posts by their chapter assignment.
 *
 * Returns chapter buckets in the order chapters are defined on the group,
 * with any unassigned posts in a leading null-slug bucket. Chapter buckets
 * that have no posts are omitted. Posts referencing an unknown chapter slug
 * fall into the unassigned bucket.
 */
export function groupPostsByChapter(group: Group): ChapterSection[] {
  const chapters = group.chapters ?? [];
  const posts = group.posts;

  const withIndex: PostWithIndex[] = posts.map((post, i) => ({ post, partIndex: i + 1 }));

  if (chapters.length === 0) {
    return withIndex.length > 0 ? [{ slug: null, title: null, posts: withIndex }] : [];
  }

  const chapterTitleBySlug = new Map(chapters.map((c) => [c.slug, c.title]));
  const buckets = new Map<string | null, PostWithIndex[]>();
  buckets.set(null, []);
  for (const c of chapters) buckets.set(c.slug, []);

  for (const entry of withIndex) {
    const key = entry.post.chapter && chapterTitleBySlug.has(entry.post.chapter)
      ? entry.post.chapter
      : null;
    buckets.get(key)!.push(entry);
  }

  const sections: ChapterSection[] = [];
  const unassigned = buckets.get(null)!;
  if (unassigned.length > 0) {
    sections.push({ slug: null, title: null, posts: unassigned });
  }
  for (const c of chapters) {
    const bucket = buckets.get(c.slug)!;
    if (bucket.length > 0) {
      sections.push({ slug: c.slug, title: c.title, posts: bucket });
    }
  }
  return sections;
}
