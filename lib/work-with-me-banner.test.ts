import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('every page exposes the professional site from the top bar', () => {
  const navbar = source('app/components/NavbarClient.tsx');

  assert.match(navbar, /https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=site_header/);
  assert.match(navbar, /className="nav-cta" href=\{WORK_SITE_URL\}/);
  assert.match(navbar, /Work with me/);
  // No Subscribe link in the bar while email signups are paused site-wide;
  // see app/components/SubscriptionForm.tsx.
  assert.doesNotMatch(navbar, /href="\/subscribe"/);
});
