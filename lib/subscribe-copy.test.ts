import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const subscribePage = readFileSync(new URL('../app/(frontend)/subscribe/page.tsx', import.meta.url), 'utf8');

test('subscribe intro matches the single confirmation email flow', () => {
  assert.match(subscribePage, /one confirmation email for everything you select/i);
  assert.match(subscribePage, /Kit may ask you to confirm once more/);
  assert.doesNotMatch(subscribePage, /Each selected preference gets its own confirmation email|confirm each one to join that list/);
});
