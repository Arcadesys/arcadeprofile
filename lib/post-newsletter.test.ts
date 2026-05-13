import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { resolveGroupHeroForPost } from './post-newsletter';

type FindArgs = {
  collection: string;
  where?: { slug?: { equals?: string } };
  depth?: number;
  limit?: number;
  overrideAccess?: boolean;
};

function stubPayload(behavior: {
  group?: Record<string, unknown> | null;
  postsForPartIndex?: Array<{ slug: string; order?: number; publishedDate?: string }>;
}) {
  const captured: { find: FindArgs[] } = { find: [] };
  const payload = {
    find: async (args: FindArgs) => {
      captured.find.push(args);
      if (args.collection === 'groups') {
        return { docs: behavior.group ? [behavior.group] : [] };
      }
      if (args.collection === 'posts') {
        return { docs: behavior.postsForPartIndex ?? [] };
      }
      return { docs: [] };
    },
  } as unknown as Parameters<typeof resolveGroupHeroForPost>[0];
  return { payload, captured };
}

test('resolveGroupHeroForPost: extracts .url from a populated Media upload (depth: 1)', async () => {
  const { payload, captured } = stubPayload({
    group: {
      title: 'It Takes a Zoo',
      image: { id: 1, url: '/api/media/file/it-takes-a-zoo.png', alt: null },
    },
    postsForPartIndex: [{ slug: 'cold-boot-6-tide', order: 6 }],
  });

  const hero = await resolveGroupHeroForPost(payload, {
    slug: 'cold-boot-6-tide',
    group: 'it-takes-a-zoo',
  });

  assert.equal(hero?.image, '/api/media/file/it-takes-a-zoo.png');
  assert.equal(hero?.title, 'It Takes a Zoo');
  assert.equal(hero?.slug, 'it-takes-a-zoo');
  // Groups query must request the upload at depth >= 1 so .url is populated.
  const groupsQuery = captured.find.find((q) => q.collection === 'groups');
  assert.ok(groupsQuery && (groupsQuery.depth ?? 0) >= 1);
});

test('resolveGroupHeroForPost: returns image: null when Media id is unpopulated (legacy number)', async () => {
  // Regression: previously this branch crashed downstream because the renderer
  // called .trim() on a number. Now we coerce to null instead.
  const { payload } = stubPayload({
    group: { title: 'Some Group', image: 1 },
    postsForPartIndex: [{ slug: 'x', order: 1 }],
  });

  const hero = await resolveGroupHeroForPost(payload, { slug: 'x', group: 'some-group' });

  assert.equal(hero?.image, null);
});

test('resolveGroupHeroForPost: returns null when group lookup yields no docs', async () => {
  const { payload } = stubPayload({ group: null });
  const hero = await resolveGroupHeroForPost(payload, { slug: 'x', group: 'missing' });
  assert.equal(hero, null);
});

test('resolveGroupHeroForPost: returns null when post has no group slug', async () => {
  const { payload } = stubPayload({ group: { title: 'x', image: null } });
  const hero = await resolveGroupHeroForPost(payload, { slug: 'x', group: null });
  assert.equal(hero, null);
});
