import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage brand bar is the writing site only; the builder door lives in the footer', () => {
  const home = source('app/(frontend)/page.tsx');
  const controls = home.slice(home.indexOf('className={styles.brandBar}'), home.indexOf('className={styles.promise}'));
  assert.ok(controls.length > 0, 'brand bar must precede the promise');

  assert.doesNotMatch(controls, /workWithMe|work\.thearcades\.me/);
  assert.doesNotMatch(controls, /href="\/subscribe"/);
  assert.match(source('lib/nav-items.ts'), /utm_content=footer/);
});
