import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { buildPostUrl } from '@/lib/post-url';
import { logger } from '@/lib/logger';
import { SITE_URL } from '@/lib/site-url';

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

  try {
    const payload = await getPayload({ config: payloadConfig });

    // Groups → /projects/<slug>/00 (the intro/hub page)
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
        url: `${SITE_URL}/projects/${slug}/00`,
        lastModified: g.updatedAt ? new Date(g.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    // Posts → /projects/<group>/<part>. The DB sort matches the order used
    // by computePostPartIndex, so we can compute the 1-based part index
    // in-memory by tracking each group's running count, rather than firing
    // a per-post query (N+1).
    const posts = await payload.find({
      collection: 'posts',
      where: {
        publish_status: { in: ['published', 'sent'] },
      },
      sort: ['order', 'publishedDate'],
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    });
    const partCounters = new Map<string, number>();
    for (const p of posts.docs) {
      const slug = p.slug as string | undefined;
      const groupSlug = p.group as string | undefined;
      if (!slug || !groupSlug) continue;
      const partIndex = (partCounters.get(groupSlug) ?? 0) + 1;
      partCounters.set(groupSlug, partIndex);
      entries.push({
        url: `${SITE_URL}${buildPostUrl(groupSlug, partIndex)}`,
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
