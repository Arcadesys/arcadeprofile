import assert from 'node:assert/strict';
import test from 'node:test';

import { absoluteSiteUrl, SITE_URL } from './site-url';

test('public SEO surfaces share the www canonical origin', () => {
  assert.equal(SITE_URL, 'https://www.thearcades.me');
  assert.equal(absoluteSiteUrl('/writing'), 'https://www.thearcades.me/writing');
});
