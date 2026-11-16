import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss, { type Rule } from 'postcss';

const file = path.join(process.cwd(), 'app/components/PieceBar.module.css');
const source = readFileSync(file, 'utf8');
const styles = postcss.parse(source);
const shortOrMobile = '(max-width: 960px), (max-height: 700px)';

function rulesFor(selector: string): Rule[] {
  const rules: Rule[] = [];
  styles.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  return rules;
}

/** Declarations for a selector, either at top level (media = null) or inside one at-rule. */
function declarations(selector: string, media: string | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rule of rulesFor(selector)) {
    const parent = rule.parent;
    const parentMedia = parent && parent.type === 'atrule' && 'params' in parent ? parent.params : null;
    if (parentMedia !== media) continue;
    rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  }
  return values;
}

test('the bar is fixed so it takes no space and cannot shift content', () => {
  const bar = declarations('.bar', null);
  assert.equal(bar.position, 'fixed');
  assert.equal(bar.top, '0');
  assert.equal(bar.right, '0');
  assert.equal(bar.left, 'var(--nav-rail-width)', 'stay clear of the fixed desktop rail');
  assert.equal(bar['z-index'], '30', 'below the drawer scrim (39), drawer (40/41) and navigation (100)');
});

test('hidden state keeps the bar in the focus tree rules but out of sight, reach and flow', () => {
  const bar = declarations('.bar', null);
  assert.equal(bar.visibility, 'hidden');
  assert.equal(bar['pointer-events'], 'none');
  assert.equal(bar.transform, 'translateY(-100%)');
  assert.notEqual(bar.display, 'none', 'display: none would change focus order and measurement');
  const shown = declarations('.bar[data-visible="true"]', null);
  assert.equal(shown.visibility, 'visible');
  assert.equal(shown['pointer-events'], 'auto');
  assert.equal(shown.transform, 'translateY(0)');
});

test('it fades and slides in over 0.18s', () => {
  const { transition } = declarations('.bar', null);
  assert.match(transition, /transform 0\.18s/);
  assert.match(transition, /opacity 0\.18s/);
});

test('short and mobile viewports sit directly under the 86px site bar, from the left edge', () => {
  const bar = declarations('.bar', shortOrMobile);
  assert.equal(bar.top, '86px');
  assert.equal(bar.left, '0', 'the rail width variable can still be set on small screens');
});

test('no motion under calm motion or prefers-reduced-motion', () => {
  assert.equal(declarations('html[data-motion="calm"] .bar', null).transition, 'none');
  assert.equal(declarations('.bar', '(prefers-reduced-motion: reduce)').transition, 'none');
});

test('the progress line is 4px, cyan over a faint track, with no animated width', () => {
  assert.equal(declarations('.track', null).height, '4px');
  assert.match(declarations('.track', null).background, /^rgba\(255, 255, 255, 0\.06\)$/);
  assert.equal(declarations('.fill', null).background, 'var(--cyan)');
  assert.equal(declarations('.fill', null).transition, undefined);
  assert.equal(declarations('.fill', null).animation, undefined);
  assert.match(declarations('.bar', null)['grid-template-rows'], /4px$/);
});

test('targets are at least 44px and the bar is 56px with its progress line', () => {
  assert.equal(declarations('.back', null)['min-height'], '52px');
  assert.equal(declarations('.back', null)['min-width'], '44px');
  assert.equal(declarations('.bar', null)['grid-template-rows'], '52px 4px');
});

test('type: mono capitals for the link, cyan mono status, one-line ellipsis title', () => {
  const back = declarations('.back', null);
  assert.equal(back.color, 'var(--fg-muted)');
  assert.equal(back['font-family'], 'var(--font-mono)');
  assert.equal(back['text-transform'], 'uppercase');
  assert.equal(declarations('.status', null).color, 'var(--cyan)');
  const title = declarations('.title', null);
  assert.equal(title['white-space'], 'nowrap');
  assert.equal(title['text-overflow'], 'ellipsis');
  assert.equal(title.overflow, 'hidden');
});

test('colours come from tokens, apart from the documented near-black panel and the faint track', () => {
  const allowed = new Set(['#09090a', 'rgba(255, 255, 255, 0.06)']);
  const raw = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi;
  styles.walkDecls((declaration) => {
    for (const match of declaration.value.match(raw) ?? []) {
      const whole = declaration.value.trim();
      assert.ok(
        allowed.has(whole) || allowed.has(match.toLowerCase()),
        `raw colour ${whole} in ${declaration.parent && 'selector' in declaration.parent ? declaration.parent.selector : ''}`,
      );
    }
  });
  assert.equal(declarations('.bar', null).background, '#09090a');
  assert.equal(declarations('.bar', null)['border-bottom'], '1px solid var(--console-border)');
});

test('no glows, no local focus outline', () => {
  assert.doesNotMatch(source, /outline/);
  assert.doesNotMatch(source, /box-shadow/);
  assert.doesNotMatch(source, /glow/);
  for (const rule of rulesFor('.back:hover')) {
    assert.equal(rule.some((node) => node.type === 'decl' && node.prop === 'text-shadow' && node.value === 'none'), true);
  }
});
