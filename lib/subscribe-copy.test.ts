import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const subscribePage = readFileSync(new URL('../app/(frontend)/subscribe/page.tsx', import.meta.url), 'utf8');

test('subscribe intro explains the first-party request and confirmation', () => {
  assert.match(subscribePage, /confirmation email for your request/i);
  assert.doesNotMatch(subscribePage, /the provider may send another confirmation email/i);
  assert.match(subscribePage, /audiences=\{\[\]\}/);
});
