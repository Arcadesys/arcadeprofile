import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { getScheduledPostsPerRun } from './cronAuth';

afterEach(() => {
  delete process.env.SCHEDULED_POSTS_PER_RUN;
});

test('getScheduledPostsPerRun returns null when unset', () => {
  delete process.env.SCHEDULED_POSTS_PER_RUN;
  assert.equal(getScheduledPostsPerRun(), null);
});

test('getScheduledPostsPerRun parses a trimmed positive integer', () => {
  process.env.SCHEDULED_POSTS_PER_RUN = ' 12 ';
  assert.equal(getScheduledPostsPerRun(), 12);
});

test('getScheduledPostsPerRun rejects malformed values instead of truncating them', () => {
  process.env.SCHEDULED_POSTS_PER_RUN = '5oops';
  assert.throws(
    () => getScheduledPostsPerRun(),
    /SCHEDULED_POSTS_PER_RUN must be a positive integer/,
  );
});

test('getScheduledPostsPerRun rejects zero', () => {
  process.env.SCHEDULED_POSTS_PER_RUN = '0';
  assert.throws(
    () => getScheduledPostsPerRun(),
    /SCHEDULED_POSTS_PER_RUN must be a positive integer/,
  );
});

test('getScheduledPostsPerRun rejects unsafe integers', () => {
  process.env.SCHEDULED_POSTS_PER_RUN = String(Number.MAX_SAFE_INTEGER + 1);
  assert.throws(
    () => getScheduledPostsPerRun(),
    /SCHEDULED_POSTS_PER_RUN must be a safe integer/,
  );
});
