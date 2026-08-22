import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SITE_BRAND_LOCKUP,
  SITE_NAME,
  SITE_NAME_UPPER,
  SITE_PLATFORM_NAME,
  SITE_TITLE_DEFAULT,
} from './site-brand';

test('canonical site branding keeps the platform and publication identities distinct', () => {
  assert.equal(SITE_PLATFORM_NAME, 'ArcadeProfile');
  assert.equal(SITE_NAME, "The Arcades' Lab");
  assert.equal(SITE_NAME_UPPER, "THE ARCADES' LAB");
  assert.equal(SITE_BRAND_LOCKUP, "ArcadeProfile / The Arcades' Lab");
  assert.equal(SITE_TITLE_DEFAULT, "THE ARCADES' LAB — Austen Tucker");
});
