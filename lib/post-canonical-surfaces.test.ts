import assert from 'node:assert/strict';
import test from 'node:test';
import { POST_CANONICAL_EDITIONS, buildPostDiscoveryUrl, validatePostCanonicalEditions } from './post-canonical';
import { getReadingCatalog } from './reading-catalog';
import { buildPostUrl } from './post-url';
import { loadMarkdownGroups, loadMarkdownPosts, selectPublicMarkdownPosts } from './markdown-posts';
import { buildMarkdownSitemapEntries, buildStaticSitemapEntries } from './sitemap';
import { buildLlmsIndex } from './llms';
import { buildSearchIndex } from './search';
import { getEditorialCatalog } from './editorial-catalog';
import { getAllPosts, buildPostUrlMap } from './blog';
import { getRelatedPosts } from './related-posts';
import { SITE_URL } from './site-url';

test('sitemap removes only the mapped duplicates and keeps collection/control/resume routes', () => {
  const groups = loadMarkdownGroups();
  const posts = selectPublicMarkdownPosts(loadMarkdownPosts());
  const urls = new Set(buildMarkdownSitemapEntries(groups, posts, SITE_URL).map((entry) => entry.url));
  for (const { creativePath, canonicalUrl } of POST_CANONICAL_EDITIONS) {
    assert.ok(!urls.has(`${SITE_URL}${creativePath}`));
    assert.ok(!urls.has(canonicalUrl), 'creative sitemap must not contain work-domain entries');
    assert.ok(urls.has(`${SITE_URL}${creativePath.slice(0, creativePath.lastIndexOf('/'))}`));
  }
  assert.equal(urls.size, groups.length + posts.length - POST_CANONICAL_EDITIONS.length);
  assert.ok(urls.has(`${SITE_URL}/projects/the-singularity-log/rabies-capitalism`));
  assert.ok(buildStaticSitemapEntries(SITE_URL).some((entry) => entry.url === `${SITE_URL}/resume`));
});

test('llms, search and editorial catalogs recommend the same three preferred editions', async () => {
  const llms = buildLlmsIndex(SITE_URL, loadMarkdownGroups(), selectPublicMarkdownPosts(loadMarkdownPosts()));
  const search = await buildSearchIndex();
  const catalog = await getEditorialCatalog();
  const editorial = [...catalog.essays, ...catalog.fiction].flatMap((group) => group.posts);
  for (const { creativePath, canonicalUrl } of POST_CANONICAL_EDITIONS) {
    assert.ok(llms.includes(`](${canonicalUrl})`));
    assert.ok(!llms.includes(`](${SITE_URL}${creativePath})`));
    assert.ok(search.some((item) => item.href === canonicalUrl));
    assert.ok(!search.some((item) => item.href === creativePath));
    assert.ok(editorial.some((item) => item.href === canonicalUrl));
  }
});

test('related-reading cards follow the map without removing distinct public essays', async () => {
  const posts = await getAllPosts();
  const locations = await buildPostUrlMap();
  const current = posts.find((post) => post.slug === 'the-safe-door');
  assert.ok(current);
  const related = getRelatedPosts(posts, current, locations, posts.length);
  for (const { canonicalUrl } of POST_CANONICAL_EDITIONS) assert.ok(related.some((item) => item.href === canonicalUrl));
  assert.ok(related.some((item) => item.href === '/projects/the-singularity-log/rabies-capitalism'));
});

test('each configured creative source is an existing public article, never a missing/future target guess', () => {
  const publicPaths = new Set(selectPublicMarkdownPosts(loadMarkdownPosts(), new Date('2026-09-30T16:00:00Z'))
    .map((post) => buildPostUrl(post.group, post.slug)));
  assert.equal(POST_CANONICAL_EDITIONS.length, 3);
  for (const { creativePath } of POST_CANONICAL_EDITIONS) assert.ok(publicPaths.has(creativePath), creativePath);
  assert.equal(buildPostDiscoveryUrl('unmapped', 'missing-target'), '/projects/unmapped/missing-target');
  assert.throws(() => validatePostCanonicalEditions([{ creativePath: '/projects/bunch/bunch', canonicalUrl: '' }]));
});

test('reading-continuity identities stay local after discovery changes', async () => {
  const catalog = await getReadingCatalog();
  for (const { creativePath, canonicalUrl } of POST_CANONICAL_EDITIONS) {
    assert.ok(catalog.some((piece) => piece.canonicalPath === creativePath));
    assert.ok(!catalog.some((piece) => piece.canonicalPath === canonicalUrl));
  }
});
