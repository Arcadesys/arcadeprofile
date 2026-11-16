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

test('homepage centres its column without reserving a navigation gutter', () => {
  const globals = source('app/globals.css');
  const home = source('app/(frontend)/home.module.css');

  const main = firstRule(home, '.main');
  assert.match(main, /margin:\s*0 auto/);
  assert.doesNotMatch(home, /138px|--nav-rail-width/);
  assert.doesNotMatch(globals, /138px|--nav-rail-width/);
});

test('homepage controls keep readable text and full-size touch targets', () => {
  const home = source('app/(frontend)/home.module.css');
  const feature = source('app/components/FeaturedCollectionCard.module.css');

  for (const selector of ['.button', '.latestLink', '.entryPathAction', '.entryPathMore a']) {
    const rule = firstRule(home, selector);
    assert.ok(remValue(rule, 'font-size') >= 1, `${selector} text must stay readable`);
    assert.ok(Number(rule.match(/min-height:\s*(\d+)px/)?.[1]) >= 44, `${selector} needs a full-size target`);
  }
  assert.ok(remValue(firstRule(feature, '.secondaryAction'), 'font-size') >= 1);
});
