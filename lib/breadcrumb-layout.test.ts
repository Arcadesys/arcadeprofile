import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss, { type Declaration, type Rule } from 'postcss';

const source = readFileSync(path.join(process.cwd(), 'app/components/Breadcrumb.module.css'), 'utf8');
const styles = postcss.parse(source);
const narrow = '(max-width: 520px)';

function rulesFor(selector: string, media?: string): Rule[] {
  const rules: Rule[] = [];
  styles.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    const parent = rule.parent;
    const parentMedia = parent && parent.type === 'atrule' && 'params' in parent ? parent.params : undefined;
    if (parentMedia === media) rules.push(rule);
  });
  return rules;
}

function declarations(selector: string, media?: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rule of rulesFor(selector, media)) {
    rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  }
  return values;
}

function allDecls(): Declaration[] {
  const found: Declaration[] = [];
  styles.walkDecls((declaration) => { found.push(declaration); });
  return found;
}

test('every trail link and the current page are at least 44px tall', () => {
  for (const selector of ['.link', '.current']) {
    const height = declarations(selector)['min-height'];
    assert.ok(height, `${selector} needs a min-height`);
    assert.ok(Number.parseFloat(height) >= 44 && height.endsWith('px'), `${selector} min-height is ${height}`);
  }
});

test('colours come from tokens only', () => {
  const colourProps = /^(color|background(-color)?|border(-.*)?-color|fill|stroke|text-shadow)$/;
  for (const declaration of allDecls()) {
    assert.doesNotMatch(declaration.value, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, `${declaration.prop} uses a raw colour`);
    if (colourProps.test(declaration.prop) && declaration.value !== 'none') {
      assert.match(declaration.value, /^var\(--[a-z-]+\)$/, `${declaration.prop} must be a token`);
    }
  }
  assert.equal(declarations('.link').color, 'var(--fg-muted)');
  assert.equal(declarations('.current').color, 'var(--fg)');
  assert.equal(declarations('.item + .item::before').color, 'var(--accent)');
  const hover = rulesFor('.link:hover')[0];
  assert.ok(hover?.selectors.includes('.link:focus-visible'));
  assert.equal(declarations('.link:hover').color, 'var(--fg)');
});

test('type is mono capitals at 0.875rem and the trail wraps rather than truncates', () => {
  const trail = declarations('.trail');
  assert.equal(trail['font-family'], 'var(--font-mono)');
  assert.equal(trail['font-size'], '0.875rem');
  assert.equal(trail['text-transform'], 'uppercase');
  assert.equal(trail['flex-wrap'], 'wrap');
  for (const declaration of allDecls()) {
    assert.ok(!['text-overflow'].includes(declaration.prop), 'must not truncate');
    assert.notEqual(declaration.prop, 'overflow-x');
  }
});

test('the global focus ring is not overridden', () => {
  for (const declaration of allDecls()) {
    assert.doesNotMatch(declaration.prop, /^outline/, 'no local outline');
    assert.doesNotMatch(declaration.value, /outline/i);
  }
});

test('no 138px rail offset sneaks in', () => {
  assert.doesNotMatch(source, /138px/);
});

test('up to 520px only the parent shows, with an arrow, and the full trail stays in the DOM', () => {
  assert.equal(declarations('.item:not(:nth-last-child(-n + 2))', narrow).display, 'none');
  const arrow = declarations('.item:nth-last-child(2)::before', narrow);
  assert.match(arrow.content.split(' ')[0], /\\2190/);
  assert.equal(arrow.color, 'var(--accent)');
  const current = declarations('.item:last-child:not(:first-child)', narrow);
  assert.notEqual(current.display, 'none', 'the current page stays exposed to assistive tech');
  assert.equal(current.position, 'absolute');
});
