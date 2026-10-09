import type { MetadataRoute } from 'next';
import { publicCrawlRule } from '@/lib/crawler-policy';
import { SITE_URL } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    // One wildcard policy welcomes every search/AI crawler, including new agents.
    rules: [publicCrawlRule('*')],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
