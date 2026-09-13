import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage exposes the professional site from its top-right hero controls', () => {
  const home = source('app/(frontend)/page.tsx');
  const controls = home.slice(home.indexOf('className={styles.topActions}'), home.indexOf('className={styles.heroEditorial}'));
  assert.ok(controls.length > 0, 'top actions must precede the hero content');

  assert.match(controls, /className=\{styles\.workWithMe\} href="https:\/\/work\.thearcades\.me"/);
  assert.match(controls, /Work with me/);
  assert.match(controls, /href="\/subscribe"/);
});
