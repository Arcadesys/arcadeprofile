import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss, { type Rule } from 'postcss';

import { BUILDER_SITE_NAV_ITEM, ORIENTATION_NAV_ITEMS, PORTFOLIO_NAV_ITEM } from './nav-items';

const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), 'utf8');
const footerSource = read('app/components/Footer.tsx');
const styles = postcss.parse(read('app/components/Footer.module.css'));
const desktopMedia = '(min-width: 961px) and (min-height: 701px)';

function declarations(selector: string, media?: string): Record<string, string> {
  const values: Record<string, string> = {};
  styles.walkRules((rule: Rule) => {
    if (!rule.selectors.includes(selector)) return;
    const parent = rule.parent;
    const inMedia = parent?.type === 'atrule' && 'params' in parent ? parent.params : undefined;
    if (inMedia !== media) return;
    rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test('the footer names every rail destination exactly as the rail does', () => {
  assert.match(footerSource, /ORIENTATION_NAV_ITEMS\.map/);
  assert.match(footerSource, /\[PORTFOLIO_NAV_ITEM, BUILDER_SITE_NAV_ITEM\]/);
  assert.deepEqual(
    [PORTFOLIO_NAV_ITEM.label, BUILDER_SITE_NAV_ITEM.label],
    ['Portfolio', 'Things I build'],
  );
  assert.doesNotMatch(footerSource, /TOYS_NAV_ITEM/, 'the toys moved to the builder site');
  assert.match(BUILDER_SITE_NAV_ITEM.href, /^https:\/\/work\.thearcades\.me\//);
  assert.doesNotMatch(footerSource, /LAB_NAV_ITEM/, 'case studies belong to the builder site');
  assert.ok(ORIENTATION_NAV_ITEMS.length > 0);
  for (const stale of ['>Bio<', '>Projects<', '>Latest<', '>Store<']) {
    assert.ok(!footerSource.includes(stale), `the footer must not hard-code the old label ${stale}`);
  }
});

test('the footer has no inline styles and no raw colours', () => {
  assert.doesNotMatch(footerSource, /style=\{\{/);
  assert.doesNotMatch(read('app/components/Footer.module.css'), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'use tokens, not raw colours');
});

test('footer links are at least 44px tall and use the console tokens', () => {
  assert.equal(declarations('.primary a')['min-height'], '44px');
  assert.equal(declarations('.more a')['min-height'], '44px');
  assert.equal(declarations('.primary a')['border'], '1px solid var(--border-strong)');
  assert.equal(declarations('.primary a:hover')['background'], 'var(--cyan)');
  assert.equal(declarations('.primary a:hover')['color'], 'var(--bg-deep)');
  assert.equal(declarations('.copy').color, 'var(--fg-muted)');
  for (const selector of ['.nav', '.copy']) {
    const size = declarations(selector)['font-size'];
    assert.ok(size && Number.parseFloat(size) >= 0.875, `${selector} must not set text below .875rem`);
  }
});

test('the footer reserves the rail width only where the rail is shown', () => {
  assert.equal(declarations('.footer', desktopMedia)['padding-left'], 'calc(1rem + var(--nav-rail-width))');
  assert.equal(declarations('.footer')['padding-left'], undefined, 'phones and short windows keep the plain gutter');
  assert.doesNotMatch(read('app/components/Footer.module.css'), /138px/);
});
