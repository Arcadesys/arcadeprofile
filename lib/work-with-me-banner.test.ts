import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage exposes the professional site from its top-right hero controls', () => {
  const home = source('app/(frontend)/page.tsx');
  const styles = source('app/(frontend)/home.module.css');

  assert.match(home, /className=\{styles\.workWithMe\} href="https:\/\/work\.thearcades\.me"/);
  assert.match(home, /AI work · Resume/);
  assert.match(home, /Work with me/);
  assert.match(home, /className=\{styles\.topActions\}/);
  assert.match(styles, /\.workWithMe\s*\{/);
  assert.match(styles, /min-height: 56px/);
  assert.match(styles, /@media \(max-width: 800px\)[\s\S]*?\.workWithMe, \.topSubscribe \{ flex: 1 1 200px; \}/);
  assert.match(styles, /@media \(max-width: 540px\)[\s\S]*?\.workWithMe, \.topSubscribe \{ width: 100%; min-height: 60px; \}/);
});
