import type { MetadataRoute } from 'next';
import { buildMarkdownSitemapEntries, buildStaticSitemapEntries } from '@/lib/sitemap';
import { loadMarkdownGroups, loadMarkdownPosts, selectPublicMarkdownPosts } from '@/lib/markdown-posts';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Entry[] = buildStaticSitemapEntries(SITE_URL);

  entries.push(...buildMarkdownSitemapEntries(
    loadMarkdownGroups(),
    selectPublicMarkdownPosts(loadMarkdownPosts(), now),
    SITE_URL,
  ));
  return entries;
}
