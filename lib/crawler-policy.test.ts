import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import robots from '../app/robots';
import { PROTECTED_CRAWL_PATHS, publicCrawlRule } from './crawler-policy';
import { buildStaticSitemapEntries } from './sitemap';
import { SITE_URL } from './site-url';

test('one wildcard group welcomes all present and future public-page crawlers', () => {
  const result = robots();
  assert.deepEqual(result.rules, [{
    userAgent: '*', allow: '/', disallow: ['/preview/', '/admin/', '/api/'],
  }]);
  assert.equal(result.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.equal(result.host, SITE_URL);
  // No narrower group can override public access or lose protected exclusions.
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
  for (const agent of ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'UnknownFutureCrawler']) {
    const rule = rules.find(item => item.userAgent === agent) ?? rules.find(item => item.userAgent === '*');
    assert.ok(rule, `${agent} has an applicable rule`);
    assert.equal(rule.allow, '/');
    assert.deepEqual(rule.disallow, [...PROTECTED_CRAWL_PATHS]);
  }
});

test('protected prefixes remain explicit and returned rules cannot mutate policy', () => {
  assert.deepEqual(PROTECTED_CRAWL_PATHS, ['/preview/', '/admin/', '/api/']);
  const first = publicCrawlRule('*');
  first.disallow.pop();
  assert.deepEqual(publicCrawlRule('*').disallow, ['/preview/', '/admin/', '/api/']);
});

test('crawler openness preserves unlisted and private metadata/discovery boundaries', () => {
  const urls = buildStaticSitemapEntries(SITE_URL).map(entry => entry.url);
  for (const restricted of ['/preview/', '/admin/', '/api/', '/subscribe/verify', '/subscribe/unsubscribe', '/subscribe/thanks', '/mff']) {
    const prefix = restricted.replace(/\/$/, '');
    assert.ok(!urls.some(url => url === `${SITE_URL}${prefix}` || url.startsWith(`${SITE_URL}${prefix}/`)), `${restricted} is not newly listed`);
  }
  for (const route of ['verify', 'unsubscribe', 'thanks']) {
    const source = readFileSync(`app/(frontend)/subscribe/${route}/page.tsx`, 'utf8');
    assert.match(source, /robots:\s*\{\s*index:\s*false/);
  }
  assert.match(readFileSync('lib/editorial-pdf-response.ts', 'utf8'), /['"]X-Robots-Tag['"]:\s*['"]noindex['"]/);
  assert.match(readFileSync('middleware.ts', 'utf8'), /PRIVATE_INTERNAL_PATHS\.has\(pathname\)/);
  assert.match(readFileSync('middleware.ts', 'utf8'), /status:\s*404/);
});
