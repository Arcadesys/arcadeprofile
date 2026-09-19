export const PROTECTED_CRAWL_PATHS = ['/preview/', '/admin/', '/api/'] as const;

/**
 * These agents have distinct documented roles, but all receive the same
 * public-site policy. Keeping the exclusions in each group avoids relying on
 * wildcard inheritance when a crawler selects its own group.
 */
export const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
] as const;

export function publicCrawlRule(userAgent: string | string[]) {
  return {
    userAgent,
    allow: '/',
    disallow: [...PROTECTED_CRAWL_PATHS],
  };
}
