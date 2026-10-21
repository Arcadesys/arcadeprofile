import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage exposes the professional site through one compact brand-bar link', () => {
  const home = source('app/(frontend)/page.tsx');
  const controls = home.slice(home.indexOf('className={styles.brandBar}'), home.indexOf('className={styles.hero}'));
  assert.ok(controls.length > 0, 'brand bar must precede the book hero');

  assert.match(controls, /className=\{styles\.workWithMe\} href="https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_header"/);
  assert.match(controls, /Work with me/);
  assert.doesNotMatch(controls, /href="\/subscribe"/);
});
