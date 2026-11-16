import assert from 'node:assert/strict';
import test from 'node:test';
import paths from '../data/analytics-public-paths.json';
import labels from '../data/analytics-mff-labels.json';
import readerPaths from '../data/analytics-reader-paths.json';
import { buildAnalyticsPublicPaths, buildAnalyticsReaderPaths, buildMffAnalyticsLabels } from './analytics-manifest';
import { loadMarkdownPosts } from '../lib/markdown-posts';
import { buildPostUrl } from '../lib/post-url';
import { PRIVATE_ROUTE_REWRITES } from '../lib/private-routes';

test('committed analytics manifests match published catalogs and source-owned MFF labels', async () => {
  assert.deepEqual(paths, buildAnalyticsPublicPaths());
  assert.deepEqual(labels, buildMffAnalyticsLabels());
  assert.deepEqual(readerPaths, await buildAnalyticsReaderPaths());
});

test('reader reporting excludes hubs, utilities, redirects and ineligible routes', async () => {
  for (const path of ['/stories', '/essays', '/writing', '/queercolumns', '/mff', '/subscribe', '/novels/it-takes-a-zoo', '/this-is-what-i-do-for-fun', '/this-is-what-i-do-for-fun/butterfly-exe', '/blog/bunch', '/projects/bunch/01']) assert.ok(!readerPaths.includes(path), path);
  assert.ok(readerPaths.includes('/projects/bunch/bunch'));
  assert.ok(readerPaths.includes('/novels/it-takes-a-zoo/cold-boot'));
  assert.deepEqual(await buildAnalyticsReaderPaths(['/stories', '/projects/bunch/bunch']), ['/projects/bunch/bunch']);
});

test('future pieces and private paths are absent from the generated public catalog', () => {
  const publicPaths = buildAnalyticsPublicPaths(new Date('2000-01-01T00:00:00Z'));
  for (const post of loadMarkdownPosts()) {
    if (Date.parse(post.publishDate) > Date.parse('2000-01-01T00:00:00Z')) assert.ok(!publicPaths.includes(buildPostUrl(post.group, post.slug)));
  }
  for (const path of [...Object.keys(PRIVATE_ROUTE_REWRITES), ...Object.values(PRIVATE_ROUTE_REWRITES), '/subscribe/verify', '/subscribe/unsubscribe', '/subscribe/thanks', '/api/subscribe', '/drafts/secret']) assert.ok(!paths.includes(path));
  assert.equal(new Set(paths).size, paths.length);
});


test('unpublished MFF labels are not serialized into the browser manifest', () => {
  assert.deepEqual(buildMffAnalyticsLabels('const MFF_PUBLIC = false; const Page = () => <h2>A private title</h2>;'), { section: [], heading: [], exhibit: [], label: [] });
});


test('new private rewrites remove both the public alias and internal implementation path', () => {
  const gated = buildAnalyticsPublicPaths(new Date(), { '/start': '/stories' });
  assert.ok(!gated.includes('/start')); assert.ok(!gated.includes('/stories'));
  assert.ok(gated.includes('/essays'));
  assert.deepEqual(buildMffAnalyticsLabels('const MFF_PUBLIC = true; const Page = () => <h2>A private title</h2>;', { '/secret': '/mff' }), { section: [], heading: [], exhibit: [], label: [] });
});


test('source-owned Callout link labels retain the rendered archive link and arrow', () => {
  const archive = 'From the archives: Disposable Art Is Still Art →';
  assert.ok(buildMffAnalyticsLabels().label.includes(archive));
  const source = `const MFF_PUBLIC = true; const Page = () => <Callout link={{ href: '/stories', label: 'A public archive' }}>Body</Callout>;`;
  assert.deepEqual(buildMffAnalyticsLabels(source).label, ['A public archive →']);
});
