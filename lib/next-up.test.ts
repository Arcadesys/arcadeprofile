import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss from 'postcss';
import { readingMinutesLabel, recommendationKind } from './next-up';

test('recommendation kinds fold chapters into fiction', () => {
  assert.equal(recommendationKind('essay'), 'essay');
  assert.equal(recommendationKind('fiction'), 'fiction');
  assert.equal(recommendationKind('chapter'), 'fiction');
});

test('the minutes line appears only when the length is known', () => {
  assert.equal(readingMinutesLabel(8), 'About 8 min read');
  assert.equal(readingMinutesLabel(undefined), null);
  assert.equal(readingMinutesLabel(0), null);
});

const cssPath = 'app/components/NextUp.module.css';
const css = readFileSync(path.join(process.cwd(), cssPath), 'utf8');

test('NextUp CSS uses tokens only, no glows or local outlines, and keeps 44px and 48px targets', () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, 'no raw hex colours');
  assert.doesNotMatch(css, /\b(?:rgba?|hsla?)\(/i, 'no raw colour functions');
  const root = postcss.parse(css);
  const byProp = new Map<string, string[]>();
  root.walkDecls((declaration) => {
    byProp.set(declaration.prop, [...(byProp.get(declaration.prop) ?? []), declaration.value]);
    assert.notEqual(declaration.prop, 'outline', 'leave focus to the global ring');
    assert.notEqual(declaration.prop, 'outline-offset');
    if (declaration.prop === 'box-shadow' || declaration.prop === 'text-shadow') assert.equal(declaration.value, 'none', 'no glows');
    if (declaration.prop === 'border-radius') assert.equal(declaration.value, '0');
  });
  const card = root.nodes.find((node) => node.type === 'rule' && node.selector === '.card');
  assert.ok(card && card.type === 'rule');
  const cardDecls = Object.fromEntries(card.nodes.flatMap((n) => n.type === 'decl' ? [[n.prop, n.value]] : []));
  assert.equal(cardDecls['border-left'], '5px solid var(--cyan)');
  assert.equal(cardDecls.border, '2px solid var(--console-border)');
  assert.equal(cardDecls.background, 'var(--surface)');
  const rule = (selector: string) => {
    const found = root.nodes.find((node) => node.type === 'rule' && node.selector === selector);
    assert.ok(found && found.type === 'rule', selector);
    return Object.fromEntries(found.nodes.flatMap((n) => n.type === 'decl' ? [[n.prop, n.value]] : []));
  };
  assert.equal(rule('.title a')['min-height'], '44px');
  assert.equal(rule('.read')['min-height'], '48px');
  assert.equal(rule('.list .card:nth-child(2)')['border-left-color'], 'var(--pink)');
  assert.equal(rule('.read').color, 'var(--accent)');
  assert.equal(rule('.meta').color, 'var(--fg-muted)');
});

test('NextUp keeps the recommendation analytics and the "More to read" heading', () => {
  const component = readFileSync(path.join(process.cwd(), 'app/components/NextUp.tsx'), 'utf8');
  assert.match(component, /placement: 'recommended-reading'/);
  assert.match(component, /canonicalDiscoveryHref\(recommendation\.canonicalPath\)/);
  assert.match(component, /canonicalId: piece\.canonicalPath/);
  assert.match(component, /contentType: piece\.contentType/);
  assert.match(component, />More to read</);
  assert.doesNotMatch(component, /Keep reading|Where to go from here/);
});

test('ReadingNextSteps hands the next part to the series card and recommendations to NextUp', () => {
  const steps = readFileSync(path.join(process.cwd(), 'app/components/ReadingNextSteps.tsx'), 'utf8');
  assert.match(steps, /<NextInSeries/);
  assert.match(steps, /<NextUp piece=\{piece\} recommendations=\{recommendedPieces\(piece, catalog\)\} \/>/);
  assert.match(steps, /skipNext/);
});
