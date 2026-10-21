import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { signupConfirmationCopy } from './signup-mode';

const subscribePage = readFileSync(new URL('../app/(frontend)/subscribe/page.tsx', import.meta.url), 'utf8');

test('subscribe intro uses the same flag-dependent confirmation copy as the server', () => {
  assert.match(subscribePage, /signupConfirmationCopy\(kitDirectActiveSignupEnabled\(\)\)/);
  assert.match(signupConfirmationCopy(false), /confirmation email for your request/i);
  assert.match(signupConfirmationCopy(false), /Kit may send additional confirmation emails/);
  assert.match(signupConfirmationCopy(true), /one confirmation email/);
  assert.doesNotMatch(signupConfirmationCopy(true), /Kit/);
  assert.match(subscribePage, /audiences=\{\[\]\}/);
});
