import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const subscribePage = readFileSync(new URL('../app/(frontend)/subscribe/page.tsx', import.meta.url), 'utf8');

test('subscribe intro explains the request and possible Kit confirmations', () => {
  assert.match(subscribePage, /confirmation email for your request/i);
  assert.match(subscribePage, /Kit may send additional confirmation emails/);
  assert.match(subscribePage, /audiences=\{\[\]\}/);
});
