import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage exposes the professional site from its top-right hero controls', () => {
  const home = source('app/(frontend)/page.tsx');
  const controls = home.slice(home.indexOf('className={styles.topActions}'), home.indexOf('className={styles.heroEditorial}'));
  assert.ok(controls.length > 0, 'top actions must precede the hero content');

  assert.match(controls, /className=\{styles\.workWithMe\} href="https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_header"/);
  assert.match(controls, /Work with me/);
  // The hero Subscribe link is removed while email signups are paused
  // site-wide; see app/components/SubscriptionForm.tsx.
  assert.doesNotMatch(controls, /href="\/subscribe"/);
});
