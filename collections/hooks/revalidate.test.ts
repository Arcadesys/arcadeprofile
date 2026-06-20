import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPageRevalidationPaths, Pages } from '../Pages';
import { buildPostRevalidationPaths, Posts } from '../Posts';
import { uniqueRevalidationPaths } from './revalidate';

test('post revalidation includes current and previous canonical URLs', () => {
  assert.deepEqual(
    buildPostRevalidationPaths(
      { slug: 'new-post', group: 'new-project' },
      { slug: 'old-post', group: 'old-project' },
    ),
    [
      '/latest',
      '/projects',
      '/feed.xml',
      '/projects/new-project',
      '/projects/new-project/new-post',
      '/projects/old-project',
      '/projects/old-project/old-post',
    ],
  );
});

test('post revalidation dedupes unchanged paths', () => {
  assert.deepEqual(
    buildPostRevalidationPaths(
      { slug: 'same-post', group: 'same-project' },
      { slug: 'same-post', group: 'same-project' },
    ),
    [
      '/latest',
      '/projects',
      '/feed.xml',
      '/projects/same-project',
      '/projects/same-project/same-post',
    ],
  );
});

test('page revalidation includes current and previous slug paths', () => {
  assert.deepEqual(
    buildPageRevalidationPaths({ slug: 'new-page' }, { slug: 'old-page' }),
    ['/new-page', '/old-page'],
  );
});

test('revalidation path normalization removes duplicates and empty paths', () => {
  assert.deepEqual(
    uniqueRevalidationPaths(['/latest', '', '/latest', '/projects']),
    ['/latest', '/projects'],
  );
});

test('public content collections revalidate paths after delete', () => {
  assert.equal(Posts.hooks?.afterDelete?.length, 1);
  assert.equal(Pages.hooks?.afterDelete?.length, 1);
});
