import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEditorialCatalog, getEditorialCatalog } from './editorial-catalog';
import { getAllPosts, type BlogPost, type PostLocation } from './blog';
import { getAllProjectHubs, type ProjectHub } from './payload';

const hubs: ProjectHub[] = [
  {
    id: 'fiction', slug: 'fiction', title: 'Fiction', description: 'Stories',
    href: '/projects/fiction', tags: [], featured: false, homeHighlight: false,
    category: 'fiction', resources: [], relatedPostSlugs: [],
  },
  {
    id: 'essays', slug: 'essays', title: 'Essays', description: 'Ideas',
    href: '/projects/essays', tags: [], featured: false, homeHighlight: false,
    category: 'writing', resources: [], relatedPostSlugs: [],
  },
  {
    id: 'tool', slug: 'tool', title: 'Tool', description: 'Not editorial',
    href: '/projects/tool', tags: [], featured: false, homeHighlight: false,
    category: 'tools', resources: [], relatedPostSlugs: [],
  },
];

const posts: BlogPost[] = [
  { id: 'fiction-old', slug: 'fiction-old', title: 'Old', date: '2026-01-01T00:00:00Z', excerpt: 'Old fiction', group: 'fiction', tags: [] },
  { id: 'fiction-new', slug: 'fiction-new', title: 'New', date: '2026-02-01T00:00:00Z', excerpt: 'New fiction', group: 'fiction', tags: [] },
  { id: 'essay', slug: 'essay', title: 'Essay', date: '2026-03-01T00:00:00Z', excerpt: 'Essay copy', group: 'essays', tags: [] },
  { id: 'tool-post', slug: 'tool-post', title: 'Tool post', date: '2026-04-01T00:00:00Z', excerpt: 'Tool copy', group: 'tool', tags: [] },
];

const locations = new Map<string, PostLocation>([
  ['fiction-old', { groupSlug: 'fiction', groupTitle: 'Fiction', partIndex: 1 }],
  ['fiction-new', { groupSlug: 'fiction', groupTitle: 'Fiction', partIndex: 2 }],
  ['essay', { groupSlug: 'essays', groupTitle: 'Essays', partIndex: 1 }],
  ['tool-post', { groupSlug: 'tool', groupTitle: 'Tool', partIndex: 1 }],
]);

test('editorial catalog classifies group-backed posts from the shared project categories', () => {
  const catalog = buildEditorialCatalog(hubs, posts, locations);

  assert.deepEqual(catalog.fiction.map((group) => group.slug), ['fiction']);
  assert.deepEqual(catalog.essays.map((group) => group.slug), ['essays']);
  assert.deepEqual(catalog.fiction[0]?.posts.map((post) => post.slug), ['fiction-new', 'fiction-old']);
  assert.equal(catalog.essays[0]?.posts[0]?.href, '/projects/essays/essay');
});

test('editorial catalog gives Zoo its canonical chapter-edition URL', () => {
  const catalog = buildEditorialCatalog(
    [{ ...hubs[0]!, slug: 'it-takes-a-zoo', href: '/novels/it-takes-a-zoo' }],
    [{ ...posts[0]!, group: 'it-takes-a-zoo' }],
    locations,
  );

  assert.equal(catalog.fiction[0]?.href, '/novels/it-takes-a-zoo');
  assert.equal(catalog.fiction[0]?.canonicalChapterCollection, true);
});

test('editorial catalog invariant leaves every categorized public post in exactly one index', () => {
  const catalog = buildEditorialCatalog(hubs, posts, locations);
  const cataloged = [
    ...catalog.fiction.flatMap((group) => group.posts),
    ...catalog.essays.flatMap((group) => group.posts),
  ];
  const expected = posts.filter((post) => post.group === 'fiction' || post.group === 'essays');

  assert.equal(cataloged.length, expected.length);
  assert.deepEqual(new Set(cataloged.map((post) => post.slug)), new Set(expected.map((post) => post.slug)));
});

test('default public catalog covers every Markdown fiction and writing post', async () => {
  const catalog = await getEditorialCatalog();
  const sourceHubs = await getAllProjectHubs();
  const sourcePosts = await getAllPosts();
  const categoryByGroup = new Map(sourceHubs.map((hub) => [hub.slug, hub.category]));
  const expectedSlugs = sourcePosts
    .filter((post) => {
      const category = post.group ? categoryByGroup.get(post.group) : undefined;
      return category === 'fiction' || category === 'writing';
    })
    .map((post) => post.slug)
    .sort();
  const catalogSlugs = [
    ...catalog.fiction.flatMap((group) => group.posts),
    ...catalog.essays.flatMap((group) => group.posts),
  ]
    .map((post) => post.slug)
    .sort();

  assert.ok(catalog.fiction.length > 0, 'the public catalog should contain fiction groups');
  assert.ok(catalog.essays.length > 0, 'the public catalog should contain essay groups');
  assert.deepEqual(catalogSlugs, expectedSlugs);
});
