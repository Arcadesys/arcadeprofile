import type { MetadataRoute } from 'next';
import type { Payload } from 'payload';

import { buildGroupIntroUrl, buildPostUrl } from '@/lib/post-url';
import { publicPostStatusWhere } from '@/lib/post-status';
import { COLLECTION, COLLECTION_PATH } from '@/lib/collection';
import { PORTFOLIO_WORKS } from '@/lib/portfolio';
import type { MarkdownGroup, MarkdownPost } from '@/lib/markdown-posts';

export type SitemapEntry = MetadataRoute.Sitemap[number];

type SitemapPayload = Pick<Payload, 'find'>;

const STATIC_ROUTES: { path: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/bio', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/bibliography', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/resume', changeFrequency: 'monthly', priority: 0.6 },
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
  { path: COLLECTION_PATH, changeFrequency: 'monthly', priority: 0.9 },
  ...COLLECTION.map((story) => ({
    path: `${COLLECTION_PATH}/${story.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
  { path: '/toys', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/interspecies-dating-is-hard', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/butterfly-exe', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/justice-porn', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/shoot-em-up', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/toys/the-day-i-split-in-two', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/latest', changeFrequency: 'daily', priority: 0.9 },
  { path: '/store', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/subscribe', changeFrequency: 'monthly', priority: 0.7 },
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
    ...posts.map((post) => ({
      url: `${siteUrl}${buildPostUrl(post.group, post.slug)}`,
      lastModified: new Date(post.updatedDate ?? post.publishDate),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}

export async function loadCmsSitemapEntries(
  payload: SitemapPayload,
  siteUrl: string,
  now: Date,
): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  const groups = await payload.find({
    collection: 'groups',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  for (const g of groups.docs) {
    const slug = g.slug as string | undefined;
    if (!slug) continue;
    entries.push({
      url: `${siteUrl}${buildGroupIntroUrl(slug)}`,
      lastModified: g.updatedAt ? new Date(g.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  const posts = await payload.find({
    collection: 'posts',
    where: {
      publish_status: publicPostStatusWhere(),
    },
    sort: ['order', 'publishedDate'],
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  for (const p of posts.docs) {
    const slug = p.slug as string | undefined;
    const groupSlug = p.group as string | undefined;
    if (!slug || !groupSlug) continue;
    entries.push({
      url: `${siteUrl}${buildPostUrl(groupSlug, slug)}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  return entries;
}
