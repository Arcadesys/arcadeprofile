import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseWorkItemInput,
  relationshipId,
  requiredParentType,
} from './work-queue';

test('work item hierarchy requires epics above stories above tasks', () => {
  assert.equal(requiredParentType('epic'), null);
  assert.equal(requiredParentType('story'), 'epic');
  assert.equal(requiredParentType('task'), 'story');
});

test('relationshipId accepts Payload relationship shapes', () => {
  assert.equal(relationshipId(12), 12);
  assert.equal(relationshipId('13'), 13);
  assert.equal(relationshipId({ id: 14 }), 14);
  assert.equal(relationshipId(null), null);
});

test('parseWorkItemInput normalizes a create payload', () => {
  assert.deepEqual(
    parseWorkItemInput({
      title: '  Define acceptance schema  ',
      type: 'task',
      parentId: 4,
      definitionOfDone: ' Tests pass. ',
      owner: 'ai',
      budgetUsd: 125,
    }),
    {
      title: 'Define acceptance schema',
      type: 'task',
      parent: 4,
      definitionOfDone: 'Tests pass.',
      owner: 'ai',
      budgetUsd: 125,
    },
  );
});

test('parseWorkItemInput rejects invalid enum and numeric values', () => {
  assert.throws(
    () => parseWorkItemInput({ title: 'Nope', type: 'subtask' }),
    /type must be one of/,
  );
  assert.throws(
    () => parseWorkItemInput({ title: 'Nope', type: 'task', budgetUsd: -1 }),
    /non-negative/,
  );
});

test('parseWorkItemInput permits bounded partial updates', () => {
  assert.deepEqual(
    parseWorkItemInput({ status: 'review', position: 2 }, { partial: true }),
    { status: 'review', position: 2 },
  );
});
