import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostDiscoveryUrl, validatePostCanonicalEditions } from './post-canonical';
import { CREATIVE_ORIGINALS_WITH_WORK_COPIES as ORIGINALS } from './post-canonical-originals.fixture';
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

test('sitemap lists the creative originals and never the work copies', () => {
  const groups = loadMarkdownGroups();
  const posts = selectPublicMarkdownPosts(loadMarkdownPosts());
  const urls = new Set(buildMarkdownSitemapEntries(groups, posts, SITE_URL).map((entry) => entry.url));
  for (const { creativePath, workCopyUrl } of ORIGINALS) {
    assert.ok(urls.has(`${SITE_URL}${creativePath}`), creativePath);
    assert.ok(!urls.has(workCopyUrl), 'creative sitemap must not contain work-domain entries');
  }
  assert.equal(urls.size, groups.length + posts.length);
  assert.ok(urls.has(`${SITE_URL}/projects/the-singularity-log/rabies-capitalism`));
  assert.ok(buildStaticSitemapEntries(SITE_URL).some((entry) => entry.url === `${SITE_URL}/resume`));
});

test('llms, search and editorial catalogs recommend the creative originals', async () => {
  const llms = buildLlmsIndex(SITE_URL, loadMarkdownGroups(), selectPublicMarkdownPosts(loadMarkdownPosts()));
  const search = await buildSearchIndex();
  const catalog = await getEditorialCatalog();
  const editorial = [...catalog.essays, ...catalog.fiction].flatMap((group) => group.posts);
  for (const { creativePath, workCopyUrl } of ORIGINALS) {
    assert.ok(llms.includes(`](${SITE_URL}${creativePath})`));
    assert.ok(!llms.includes(`](${workCopyUrl})`));
    assert.ok(search.some((item) => item.href === creativePath));
    assert.ok(!search.some((item) => item.href === workCopyUrl));
    assert.ok(editorial.some((item) => item.href === creativePath));
    assert.ok(!editorial.some((item) => item.href === workCopyUrl));
  }
});

test('related-reading cards link the creative originals, not the work copies', async () => {
  const posts = await getAllPosts();
  const locations = await buildPostUrlMap();
  const current = posts.find((post) => post.slug === 'the-safe-door');
  assert.ok(current);
  const related = getRelatedPosts(posts, current, locations, posts.length);
  for (const { creativePath, workCopyUrl } of ORIGINALS) {
    assert.ok(related.some((item) => item.href === creativePath), creativePath);
    assert.ok(!related.some((item) => item.href === workCopyUrl));
  }
  assert.ok(related.some((item) => item.href === '/projects/the-singularity-log/rabies-capitalism'));
});

test('each creative original is an existing public article', () => {
  const publicPaths = new Set(selectPublicMarkdownPosts(loadMarkdownPosts(), new Date('2026-09-30T16:00:00Z'))
    .map((post) => buildPostUrl(post.group, post.slug)));
  for (const { creativePath } of ORIGINALS) assert.ok(publicPaths.has(creativePath), creativePath);
  assert.equal(buildPostDiscoveryUrl('unmapped', 'missing-target'), '/projects/unmapped/missing-target');
  assert.throws(() => validatePostCanonicalEditions([{ creativePath: '/projects/bunch/bunch', canonicalUrl: '' }]));
});

test('reading-continuity identities stay local after discovery changes', async () => {
  const catalog = await getReadingCatalog();
  for (const { creativePath, workCopyUrl } of ORIGINALS) {
    assert.ok(catalog.some((piece) => piece.canonicalPath === creativePath));
    assert.ok(!catalog.some((piece) => piece.canonicalPath === workCopyUrl));
  }
});
