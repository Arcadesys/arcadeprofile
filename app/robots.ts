import type { MetadataRoute } from 'next';
import { AI_CRAWLER_USER_AGENTS, publicCrawlRule } from '@/lib/crawler-policy';
import { SITE_URL } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      publicCrawlRule('*'),
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => publicCrawlRule(userAgent)),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
