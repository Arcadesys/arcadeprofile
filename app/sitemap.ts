import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { hasConfiguredDatabaseURL } from '@/lib/env';
import { logger } from '@/lib/logger';
import { buildMarkdownSitemapEntries, buildStaticSitemapEntries, loadCmsSitemapEntries } from '@/lib/sitemap';
import { getBlogSource } from '@/lib/blog';
import { loadMarkdownGroups, loadMarkdownPosts, selectPublicMarkdownPosts } from '@/lib/markdown-posts';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Entry[] = buildStaticSitemapEntries(SITE_URL);

  if (getBlogSource() === 'markdown') {
    entries.push(...buildMarkdownSitemapEntries(
      loadMarkdownGroups(),
      selectPublicMarkdownPosts(loadMarkdownPosts(), now),
      SITE_URL,
    ));
    return entries;
  }

  if (!hasConfiguredDatabaseURL()) {
    return entries;
  }

  try {
    const payload = await getPayload({ config: payloadConfig });
    entries.push(...await loadCmsSitemapEntries(payload, SITE_URL, now));
  } catch (err) {
    logger.error({ err }, '[sitemap] failed to load CMS entries — returning static-only sitemap');
  }

  return entries;
}
