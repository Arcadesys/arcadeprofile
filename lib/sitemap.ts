import { mappedPostCanonicalUrl } from '@/lib/post-canonical';
import type { MetadataRoute } from 'next';
import { buildGroupIntroUrl, buildPostUrl } from '@/lib/post-url';
import { COLLECTION, COLLECTION_PATH } from '@/lib/collection';
import { PORTFOLIO_WORKS } from '@/lib/portfolio';
import type { MarkdownGroup, MarkdownPost } from '@/lib/markdown-posts';
import { ZOO_CHAPTERS, ZOO_COLLECTION_PATH } from '@/lib/zoo-collection';
import { BOOKS, bookPath } from '@/data/books';

export type SitemapEntry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: { path: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/stories', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/essays', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/writing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/bio', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/bibliography', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/books', changeFrequency: 'monthly', priority: 0.9 },
  ...BOOKS.map((book) => ({
    path: bookPath(book),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
  { path: '/projects', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/portfolio', changeFrequency: 'monthly', priority: 0.9 },
  ...PORTFOLIO_WORKS.map((work) => ({
    path: `/portfolio/${work.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
  { path: '/lab', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/lab/wizwor', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/lab/toontok', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/lab/arcadeprofile', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/lab/conductor', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/lab/cultural-weather-vane', changeFrequency: 'monthly', priority: 0.8 },
  { path: COLLECTION_PATH, changeFrequency: 'monthly', priority: 0.9 },
  ...COLLECTION.map((story) => ({
    path: `${COLLECTION_PATH}/${story.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
  { path: ZOO_COLLECTION_PATH, changeFrequency: 'monthly', priority: 0.9 },
  { path: '/novels/estelles-children', changeFrequency: 'monthly', priority: 0.8 },
  ...ZOO_CHAPTERS.map((chapter) => ({
    path: chapter.path,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
  { path: '/toys', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/interspecies-dating-is-hard', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/butterfly-exe', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/justice-porn', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/shoot-em-up', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/the-day-i-split-in-two', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/message-in-a-bottle/guide.html', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/message-in-a-bottle', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/cultural-weather-vane', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/latest', changeFrequency: 'daily', priority: 0.9 },
];

export function buildStaticSitemapEntries(siteUrl: string): SitemapEntry[] {
  return STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority,
  }));
}

export function buildMarkdownSitemapEntries(
  groups: readonly MarkdownGroup[],
  posts: readonly MarkdownPost[],
  siteUrl: string,
): SitemapEntry[] {
  return [
    ...groups.map((group) => ({
      url: `${siteUrl}${buildGroupIntroUrl(group.slug)}`,
      lastModified: group.project?.updatedAt ? new Date(group.project.updatedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...posts.filter((post) => !mappedPostCanonicalUrl(buildPostUrl(post.group, post.slug))).map((post) => ({
      url: `${siteUrl}${buildPostUrl(post.group, post.slug)}`,
      lastModified: new Date(post.updatedDate ?? post.publishDate),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
