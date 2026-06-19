import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePositiveIntegerId } from './positive-integer-id';

test('parsePositiveIntegerId accepts trimmed positive decimal integers', () => {
  assert.equal(parsePositiveIntegerId('1'), 1);
  assert.equal(parsePositiveIntegerId(' 42 '), 42);
});

test('parsePositiveIntegerId rejects loose number coercions', () => {
  assert.equal(parsePositiveIntegerId('0'), null);
  assert.equal(parsePositiveIntegerId('-3'), null);
  assert.equal(parsePositiveIntegerId('1.5'), null);
  assert.equal(parsePositiveIntegerId('0x10'), null);
  assert.equal(parsePositiveIntegerId('1e3'), null);
  assert.equal(parsePositiveIntegerId(''), null);
});

test('parsePositiveIntegerId rejects unsafe integers', () => {
  assert.equal(parsePositiveIntegerId(String(Number.MAX_SAFE_INTEGER + 1)), null);
});
