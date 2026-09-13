import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function firstRule(css: string, selector: string) {
  const match = css.match(new RegExp(`(?:^|\\n)[ \\t]*(?:[^{}\\n]*,\\s*)?${escape(selector)}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing rule for ${selector}`);
  return match[1];
}

function remValue(declarations: string, property: string) {
  const match = declarations.match(new RegExp(`${property}:\\s*(?:clamp\\()?([\\d.]+)rem`));
  assert.ok(match, `missing rem ${property}`);
  return Number(match[1]);
}

test('homepage stops reserving the nav rail gutter under the same query that collapses the rail', () => {
  const globals = source('app/globals.css');
  const home = source('app/(frontend)/home.module.css');

  const navCollapse = globals.match(/@media ([^{]+?)\s*\{\s*\.site-nav\s*\{\s*position:\s*sticky/)?.[1];
  assert.ok(navCollapse, 'nav rail collapse query not found in globals.css');

  const block = home.match(new RegExp(`@media ${escape(navCollapse)}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1];
  assert.ok(block, `home.module.css has no @media ${navCollapse} block`);
  const main = firstRule(block, '.main');
  assert.match(main, /margin-inline:\s*auto/);
  assert.doesNotMatch(main, /138px/);

  // The rail gutter may only be reserved by the base rule, never re-added inside a breakpoint.
  const firstMedia = home.indexOf('@media');
  assert.ok(home.lastIndexOf('138px') < firstMedia);
});

test('homepage controls keep readable text and full-size touch targets', () => {
  const home = source('app/(frontend)/home.module.css');
  const feature = source('app/components/FeaturedCollectionCard.module.css');

  assert.ok(Number(firstRule(home, '.brandLockup').match(/min-height:\s*(\d+)px/)?.[1]) >= 44);
  assert.ok(remValue(firstRule(home, '.brandLockup'), 'font-size') >= 1);
  assert.ok(remValue(firstRule(home, '.topSubscribe'), 'font-size') >= 1);
  assert.ok(remValue(firstRule(home, '.button'), 'font-size') >= 1);
  assert.ok(remValue(firstRule(home, '.recentActions button'), 'font-size') >= 1);
  assert.ok(remValue(firstRule(feature, '.secondaryAction'), 'font-size') >= 1);
});
