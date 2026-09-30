import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss, { type Rule } from 'postcss';

const source = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const styles = postcss.parse(source('app/components/EditorialIndex.module.css'));

function declarations(rule: Rule): Record<string, string> {
  const values: Record<string, string> = {};
  rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  return values;
}

test('Stories and Essays share the rail-aware editorial main', () => {
  for (const route of ['stories', 'essays']) {
    assert.match(source(`app/(frontend)/${route}/page.tsx`), /<EditorialIndex\b/);
  }
  assert.match(source('app/components/EditorialIndex.tsx'), /<main className=\{styles\.main\}>/);
});

test('editorial indexes keep mobile and short-viewport gutters independent of saved rail state', () => {
  const mainRules: Rule[] = [];
  styles.walkRules((rule) => {
    if (rule.parent?.type === 'root' && rule.selectors.includes('.main')) mainRules.push(rule);
  });

  assert.equal(mainRules.length, 1, 'keep one mobile baseline instead of competing main overrides');
  const main = declarations(mainRules[0]);
  assert.equal(main.width, 'min(100% - 2rem, 74rem)');
  assert.equal(main.margin, '0 auto');
  assert.equal(main['margin-left'], undefined);
  assert.doesNotMatch(JSON.stringify(main), /--nav-rail-width/);
});

test('desktop indexes reserve the expanded or collapsed rail plus equal page gutters', () => {
  const desktopMedia = '(min-width: 961px) and (min-height: 701px)';
  const railRules: Rule[] = [];
  styles.walkRules((rule) => {
    if (rule.toString().includes('var(--nav-rail-width)')) railRules.push(rule);
  });

  assert.equal(railRules.length, 1);
  const rule = railRules[0];
  assert.equal(rule.parent?.type, 'atrule');
  assert.ok(rule.parent && 'params' in rule.parent);
  assert.equal(rule.parent.params, desktopMedia);
  // The qualified selector must beat the shell's collapsed body > main margin.
  assert.deepEqual(rule.selectors, ['.main', ':global(html[data-nav-collapsed="true"]) .main']);
  const main = declarations(rule);
  assert.equal(main.width, 'min(calc(100% - var(--nav-rail-width) - 2rem), 74rem)');
  assert.equal(main['margin-left'], 'calc(var(--nav-rail-width) + max(1rem, (100% - var(--nav-rail-width) - 74rem) / 2))');

  const globals = postcss.parse(source('app/globals.css'));
  let matchingRailBreakpoint = false;
  globals.walkAtRules('media', (media) => {
    if (media.params !== desktopMedia) return;
    media.walkDecls('--nav-rail-width', (declaration) => {
      if (declaration.value === '138px') matchingRailBreakpoint = true;
    });
  });
  assert.ok(matchingRailBreakpoint, 'editorial spacing must follow the fixed navigation breakpoint');
});
