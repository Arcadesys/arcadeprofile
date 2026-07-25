import type { MetadataRoute } from 'next';
import type { Payload } from 'payload';

import { buildGroupIntroUrl, buildPostUrl } from '@/lib/post-url';
import { publicPostStatusWhere } from '@/lib/post-status';

export type SitemapEntry = MetadataRoute.Sitemap[number];

type SitemapPayload = Pick<Payload, 'find'>;

const STATIC_ROUTES: { path: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/bio', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/resume', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/projects', changeFrequency: 'weekly', priority: 0.9 },
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

export function buildStaticSitemapEntries(siteUrl: string, now: Date): SitemapEntry[] {
  return STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
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
