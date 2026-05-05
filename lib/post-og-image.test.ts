import assert from 'node:assert/strict';
import test from 'node:test';

import type { Group, Media, Post } from '@/payload-types';
import { resolvePostOgImage } from './post-og-image';

type PartialPost = Pick<Post, 'id' | 'group' | 'chapter' | 'meta' | 'publish_status'> & { id: number };

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
}) {
  const posts = opts.posts ?? [];
  const groups = opts.groups ?? [];
  const mediaById = opts.media ?? {};
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return {
    async find({ collection, where, limit }: any) {
      if (collection === 'posts') {
        const groupSlug = where?.group?.equals;
        const chapterSlug = where?.chapter?.equals;
        const excludeId = where?.id?.not_equals;
        const requireImage = !!where?.['meta.image']?.exists;
        const statusIn: string[] | undefined = where?.publish_status?.in;
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
    meta: { image: media({ id: 5, url: 'https://cdn.example/sib.jpg', sizes: { og: { url: 'https://cdn.example/sib-og.jpg', width: 1200, height: 630 } } }) },
  } as Post;
  const post: PartialPost = { id: 1, group: 'g', chapter: 'c1', meta: {} };
  const payload = makePayload({ posts: [sibling] });
  const og = await resolvePostOgImage(payload, post as Post);
  assert.equal(og?.source, 'chapter-sibling');
  assert.equal(og?.url, 'https://cdn.example/sib-og.jpg');
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
