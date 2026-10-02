export const PROTECTED_CRAWL_PATHS = ['/preview/', '/admin/', '/api/'] as const;

/** Public content is open to all crawlers; private/API exclusions remain shared. */
export function publicCrawlRule(userAgent: string | string[]) {
  return {
    userAgent,
    allow: '/',
    disallow: [...PROTECTED_CRAWL_PATHS],
  };
}
