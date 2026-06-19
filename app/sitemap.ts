import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { buildPostUrl, buildGroupIntroUrl } from '@/lib/post-url';
import { hasConfiguredDatabaseURL } from '@/lib/env';
import { logger } from '@/lib/logger';
import { publicPostStatusWhere } from '@/lib/post-status';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

type Entry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: { path: string; changeFrequency: Entry['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/bio', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/resume', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/projects', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/latest', changeFrequency: 'daily', priority: 0.9 },
  { path: '/store', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/subscribe', changeFrequency: 'monthly', priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Entry[] = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  if (!hasConfiguredDatabaseURL()) {
    return entries;
  }

  try {
    const payload = await getPayload({ config: payloadConfig });

    // Groups → /projects/<slug> (the intro/hub page)
    const groups = await payload.find({
      collection: 'groups',
      limit: 500,
      depth: 0,
      overrideAccess: true,
    });
    for (const g of groups.docs) {
      const slug = g.slug as string | undefined;
      if (!slug) continue;
      entries.push({
        url: `${SITE_URL}${buildGroupIntroUrl(slug)}`,
        lastModified: g.updatedAt ? new Date(g.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    // Posts → /projects/<group>/<post-slug>
    const posts = await payload.find({
      collection: 'posts',
      where: {
        publish_status: publicPostStatusWhere(),
      },
      sort: ['order', 'publishedDate'],
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    });
    for (const p of posts.docs) {
      const slug = p.slug as string | undefined;
      const groupSlug = p.group as string | undefined;
      if (!slug || !groupSlug) continue;
      entries.push({
        url: `${SITE_URL}${buildPostUrl(groupSlug, slug)}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  } catch (err) {
    logger.error({ err }, '[sitemap] failed to load CMS entries — returning static-only sitemap');
  }

  return entries;
}
