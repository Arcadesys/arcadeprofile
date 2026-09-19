import assert from 'node:assert/strict';
import test from 'node:test';

import { AI_CRAWLER_USER_AGENTS, PROTECTED_CRAWL_PATHS, publicCrawlRule } from './crawler-policy';

test('AI crawler policy gives every documented agent the public rule and protected exclusions', () => {
  assert.deepEqual(AI_CRAWLER_USER_AGENTS, [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  ]);
  assert.deepEqual(publicCrawlRule('GPTBot'), {
    userAgent: 'GPTBot',
    allow: '/',
    disallow: [...PROTECTED_CRAWL_PATHS],
  });
});
