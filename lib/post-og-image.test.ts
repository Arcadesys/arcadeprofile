import assert from 'node:assert/strict';
import test from 'node:test';

import type { Group, Media, Post } from '@/payload-types';
import { resolvePostHeroImage, resolvePostOgImage } from './post-og-image';

type PartialPost = Pick<
  Post,
  'id' | 'group' | 'chapter' | 'meta' | 'publish_status' | 'heroImage'
> & { id: number };

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    updatedAt: '2026-01-01',
    createdAt: '2026-01-01',
    url: 'https://cdn.example/orig.jpg',
    alt: 'alt',
    width: 2000,
    height: 1000,
    sizes: {
      og: { url: 'https://cdn.example/og.jpg', width: 1200, height: 630 },
    },
    ...overrides,
  };
}

function makePayload(opts: {
  posts?: Post[];
  groups?: Group[];
  media?: Record<number, Media>;
  calls?: unknown[];
}) {
  const posts = opts.posts ?? [];
  const groups = opts.groups ?? [];
  const mediaById = opts.media ?? {};
  const calls = opts.calls;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return {
    async find(args: any) {
      calls?.push(args);
      const { collection, where, limit } = args;
      if (collection === 'posts') {
        const clauses = Array.isArray(where?.and) ? where.and : [where];
        const groupSlug = clauses.find((clause: any) => clause?.group?.equals)?.group?.equals;
        const chapterSlug = clauses.find((clause: any) => clause?.chapter?.equals)?.chapter?.equals;
        const excludeId = clauses.find((clause: any) => clause?.id?.not_equals)?.id?.not_equals;
        const requireImage = clauses.some((clause: any) => !!clause?.['meta.image']?.exists);
        const statusIn: string[] | undefined = clauses.find((clause: any) => clause?.publish_status?.in)
          ?.publish_status?.in;
        const docs = posts.filter((p) => {
          if (groupSlug && p.group !== groupSlug) return false;
          if (chapterSlug && p.chapter !== chapterSlug) return false;
          if (excludeId && p.id === excludeId) return false;
          if (requireImage && !p.meta?.image) return false;
          if (statusIn && !statusIn.includes(p.publish_status ?? '')) return false;
          return true;
        });
        return { docs: docs.slice(0, limit ?? docs.length) };
      }
      if (collection === 'groups') {
        const slug = where?.slug?.equals;
        return { docs: groups.filter((g) => g.slug === slug).slice(0, limit ?? 1) };
      }
      return { docs: [] };
    },
    async findByID({ collection, id }: any) {
      if (collection === 'media') {
        return mediaById[id] ?? null;
      }
      return null;
    },
  } as any;
}

test('uses post meta.image when present', async () => {
  const post: PartialPost = {
    id: 1,
    group: 'g',
    chapter: null,
    publish_status: 'published',
    meta: { image: media({ url: 'https://cdn.example/post.jpg', sizes: { og: { url: 'https://cdn.example/post-og.jpg', width: 1200, height: 630 } } }) },
  };
  const payload = makePayload({});
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'post');
  assert.equal(og?.url, 'https://cdn.example/post-og.jpg');
});

test('falls back to a chapter sibling when post has no image', async () => {
  const sibling: Post = {
    id: 2,
    title: 'sib',
    slug: 'sib',
    excerpt: '',
    content: {} as any,
    publishedDate: '2026-01-01',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'published',
    meta: { image: media({ id: 5, url: 'https://cdn.example/sib.jpg', sizes: { og: { url: 'https://cdn.example/sib-og.jpg', width: 1200, height: 630 } } }) },
  } as Post;
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ posts: [sibling] });
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'chapter-sibling');
  assert.equal(og?.url, 'https://cdn.example/sib-og.jpg');
});

test('chooses the earliest public sibling image by shared group order', async () => {
  const unorderedSibling: Post = {
    id: 2,
    title: 'unordered sib',
    slug: 'unordered-sib',
    excerpt: '',
    content: {} as any,
    publishedDate: '2026-01-03',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'published',
    meta: { image: media({ id: 5, sizes: { og: { url: 'https://cdn.example/unordered-og.jpg', width: 1200, height: 630 } } }) },
  } as Post;
  const orderedSibling: Post = {
    id: 3,
    title: 'ordered sib',
    slug: 'ordered-sib',
    excerpt: '',
    content: {} as any,
    order: 1,
    publishedDate: '2026-01-01',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'published',
    meta: { image: media({ id: 6, sizes: { og: { url: 'https://cdn.example/ordered-og.jpg', width: 1200, height: 630 } } }) },
  } as Post;
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ posts: [unorderedSibling, orderedSibling] });
  const og = await resolvePostOgImage(payload, post as Post);

  assert.equal(og?.source, 'chapter-sibling');
  assert.equal(og?.url, 'https://cdn.example/ordered-og.jpg');
});

test('skips stale sibling image refs and uses the next valid sibling image', async () => {
  const staleSibling: Post = {
    id: 2,
    title: 'stale sib',
    slug: 'stale-sib',
    excerpt: '',
    content: {} as any,
    order: 1,
    publishedDate: '2026-01-01',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'published',
    meta: { image: 404 },
  } as Post;
  const validSibling: Post = {
    id: 3,
    title: 'valid sib',
    slug: 'valid-sib',
    excerpt: '',
    content: {} as any,
    order: 2,
    publishedDate: '2026-01-02',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'published',
    meta: { image: media({ id: 6, sizes: { og: { url: 'https://cdn.example/valid-og.jpg', width: 1200, height: 630 } } }) },
  } as Post;
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ posts: [staleSibling, validSibling] });
  const og = await resolvePostOgImage(payload, post as Post);

  assert.equal(og?.source, 'chapter-sibling');
  assert.equal(og?.url, 'https://cdn.example/valid-og.jpg');
});

test('checks every sibling image candidate without a fixed cap', async () => {
  const posts = Array.from({ length: 75 }, (_, i) => ({
    id: i + 2,
    title: `sib ${i + 1}`,
    slug: `sib-${i + 1}`,
    excerpt: '',
    content: {} as any,
    order: i + 1,
    publishedDate: '2026-01-01',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'published',
    meta: { image: i === 74 ? media({ id: 6, sizes: { og: { url: 'https://cdn.example/last-og.jpg', width: 1200, height: 630 } } }) : 404 },
  })) as Post[];
  const calls: unknown[] = [];
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ posts, calls });
  const og = await resolvePostOgImage(payload, post as Post);

  assert.equal(og?.source, 'chapter-sibling');
  assert.equal(og?.url, 'https://cdn.example/last-og.jpg');
  assert.equal((calls[0] as { pagination?: unknown }).pagination, false);
  assert.equal('limit' in (calls[0] as Record<string, unknown>), false);
});

test('ignores draft sibling images for public OG fallback', async () => {
  const draftSibling: Post = {
    id: 2,
    title: 'draft sib',
    slug: 'draft-sib',
    excerpt: '',
    content: {} as any,
    publishedDate: '2026-01-01',
    group: 'g',
    chapter: 'c1',
    updatedAt: '',
    publish_status: 'draft',
    meta: { image: media({ id: 5, url: 'https://cdn.example/draft.jpg' }) },
  } as Post;
  const group: Group = {
    id: 1,
    title: 'G',
    slug: 'g',
    updatedAt: '',
    createdAt: '',
    image: media({ id: 9, sizes: { og: { url: 'https://cdn.example/group-og.jpg', width: 1200, height: 630 } } }),
  } as Group;
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ posts: [draftSibling], groups: [group] });
  const og = await resolvePostOgImage(payload, post as Post);

  assert.equal(og?.source, 'group');
  assert.equal(og?.url, 'https://cdn.example/group-og.jpg');
});

test('falls back to group meta.image when no sibling has one', async () => {
  const groupMedia = media({ id: 9, sizes: { og: { url: 'https://cdn.example/grp-og.jpg', width: 1200, height: 630 } } });
  const group: Group = {
    id: 1,
    title: 'G',
    slug: 'g',
    updatedAt: '',
    createdAt: '',
    meta: { image: groupMedia },
    image: null,
  } as Group;
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ groups: [group] });
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'group');
  assert.equal(og?.url, 'https://cdn.example/grp-og.jpg');
});

test('falls back to group hero image when meta.image is unset', async () => {
  const heroMedia = media({ id: 9, sizes: { og: { url: 'https://cdn.example/hero-og.jpg', width: 1200, height: 630 } } });
  const group: Group = {
    id: 1,
    title: 'G',
    slug: 'g',
    updatedAt: '',
    createdAt: '',
    image: heroMedia,
  } as Group;
  const post: PartialPost = { id: 1, group: 'g', chapter: null, meta: {} };
  const payload = makePayload({ groups: [group] });
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'group');
  assert.equal(og?.url, 'https://cdn.example/hero-og.jpg');
});

test('returns null when nothing in the chain has an image', async () => {
  const post: PartialPost = { id: 1, group: 'g', chapter: null, meta: {} };
  const payload = makePayload({});
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og, null);
});

test('heroImage wins over meta.image', async () => {
  const post: PartialPost = {
    id: 1,
    group: 'g',
    chapter: null,
    publish_status: 'published',
    heroImage: media({ id: 11, sizes: { og: { url: 'https://cdn.example/hero-pic-og.jpg', width: 1200, height: 630 } } }),
    meta: { image: media({ id: 12, sizes: { og: { url: 'https://cdn.example/series-card-og.jpg', width: 1200, height: 630 } } }) },
  };
  const payload = makePayload({});
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'hero');
  assert.equal(og?.url, 'https://cdn.example/hero-pic-og.jpg');
});

test('heroImage resolves from a bare media id', async () => {
  const post: PartialPost = { id: 1, group: 'g', chapter: null, heroImage: 11, meta: {} };
  const payload = makePayload({
    media: { 11: media({ id: 11, sizes: { og: { url: 'https://cdn.example/by-id-og.jpg', width: 1200, height: 630 } } }) },
  });
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'hero');
  assert.equal(og?.url, 'https://cdn.example/by-id-og.jpg');
});

test('resolvePostHeroImage does NOT fall back to the group card', async () => {
  // The whole point of the separate resolver: a post with no art of its own
  // renders no banner, rather than inheriting the series card that every
  // sibling would also show.
  const group: Group = {
    id: 1,
    title: 'G',
    slug: 'g',
    updatedAt: '',
    createdAt: '',
    image: media({ id: 9 }),
  } as Group;
  const payload = makePayload({ groups: [group] });

  assert.equal(await resolvePostHeroImage(payload, { heroImage: null }), null);
  assert.equal(await resolvePostHeroImage(payload, { heroImage: undefined }), null);
});
