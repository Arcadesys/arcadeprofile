import assert from 'node:assert/strict';
import test from 'node:test';

import {
  draftOrMissingPostStatusClauses,
  isPrePublicOrMissingPostStatus,
  isPublicPostStatus,
  prePublicOrMissingPostStatusClauses,
  publicPostStatusWhere,
} from './post-status';

test('isPublicPostStatus only accepts public workflow statuses', () => {
  assert.equal(isPublicPostStatus('published'), true);
  assert.equal(isPublicPostStatus('sent'), true);
  assert.equal(isPublicPostStatus('draft'), false);
  assert.equal(isPublicPostStatus('scheduled'), false);
  assert.equal(isPublicPostStatus(null), false);
});

test('isPrePublicOrMissingPostStatus accepts draft, scheduled, and legacy missing status', () => {
  assert.equal(isPrePublicOrMissingPostStatus('draft'), true);
  assert.equal(isPrePublicOrMissingPostStatus('scheduled'), true);
  assert.equal(isPrePublicOrMissingPostStatus(null), true);
  assert.equal(isPrePublicOrMissingPostStatus(undefined), true);
  assert.equal(isPrePublicOrMissingPostStatus('published'), false);
  assert.equal(isPrePublicOrMissingPostStatus('sent'), false);
  assert.equal(isPrePublicOrMissingPostStatus('weird'), false);
});

test('publicPostStatusWhere returns all public statuses', () => {
  assert.deepEqual(publicPostStatusWhere(), { in: ['published', 'sent'] });
});

test('prePublicOrMissingPostStatusClauses includes legacy missing statuses', () => {
  assert.deepEqual(prePublicOrMissingPostStatusClauses(), [
    { publish_status: { equals: 'draft' } },
    { publish_status: { equals: 'scheduled' } },
    { publish_status: { equals: null } },
  ]);
});

test('draftOrMissingPostStatusClauses includes legacy missing draft statuses', () => {
  assert.deepEqual(draftOrMissingPostStatusClauses(), [
    { publish_status: { equals: 'draft' } },
    { publish_status: { equals: null } },
  ]);
});
