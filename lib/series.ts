import type { BlogPost } from './blog';
import { getAllPosts } from './blog';
import { getAllStories, type StoryMeta } from './stories';

export interface EssaySeries {
  slug: string;
  title: string;
  posts: BlogPost[];
}

export type SeriesHubRow =
  | { kind: 'story'; data: StoryMeta }
  | { kind: 'essay'; data: EssaySeries };

export function getAllEssaySeries(): EssaySeries[] {
  const posts = getAllPosts().filter(p => p.series);
  const map = new Map<string, BlogPost[]>();
  for (const p of posts) {
    const key = p.series!;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const result: EssaySeries[] = [];
  for (const [slug, list] of Array.from(map.entries())) {
    const sorted = [...list].sort((a, b) => {
      const ap = a.seriesPart ?? 0;
      const bp = b.seriesPart ?? 0;
      if (ap !== bp) return ap - bp;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    const title =
      sorted.find(p => p.seriesTitle)?.seriesTitle ??
      slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    result.push({ slug, title, posts: sorted });
  }

  return result.sort((a, b) => {
    const lastA = a.posts[a.posts.length - 1]?.date ?? '';
    const lastB = b.posts[b.posts.length - 1]?.date ?? '';
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });
}

export function getEssaySeriesBySlug(slug: string): EssaySeries | null {
  return getAllEssaySeries().find(s => s.slug === slug) ?? null;
}

export function getSeriesHubRows(): SeriesHubRow[] {
  const stories = getAllStories().map(
    (s): SeriesHubRow => ({ kind: 'story', data: s })
  );
  const essays = getAllEssaySeries().map(
    (e): SeriesHubRow => ({ kind: 'essay', data: e })
  );
  return [...stories, ...essays].sort((a, b) => {
    const dateA =
      a.kind === 'story'
        ? a.data.latestChapterDate
        : a.data.posts[a.data.posts.length - 1]?.date ?? '';
    const dateB =
      b.kind === 'story'
        ? b.data.latestChapterDate
        : b.data.posts[b.data.posts.length - 1]?.date ?? '';
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}
