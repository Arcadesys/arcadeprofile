import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss, { type Rule } from 'postcss';

const source = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const indexLayouts = [
  { name: 'Stories and Essays', file: 'app/components/EditorialIndex.module.css', maxWidth: '74rem' },
  { name: 'Writing', file: 'app/(frontend)/writing/writing.module.css', maxWidth: '70rem' },
] as const;

function declarations(rule: Rule): Record<string, string> {
  const values: Record<string, string> = {};
  rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  return values;
}

test('Stories and Essays share the editorial main', () => {
  for (const route of ['stories', 'essays']) {
    assert.match(source(`app/(frontend)/${route}/page.tsx`), /<EditorialIndex\b/);
  }
  assert.match(source('app/components/EditorialIndex.tsx'), /<main className=\{styles\.main\}>/);
});

for (const { name, file, maxWidth } of indexLayouts) {
  const styles = postcss.parse(source(file));

  test(`${name} centres one main column with equal gutters at every viewport`, () => {
    const mainRules: Rule[] = [];
    styles.walkRules((rule) => {
      if (rule.parent?.type === 'root' && rule.selectors.includes('.main')) mainRules.push(rule);
    });

    assert.equal(mainRules.length, 1, 'keep one baseline instead of competing main overrides');
    const main = declarations(mainRules[0]);
    assert.equal(main.width, `min(100% - 2rem, ${maxWidth})`);
    assert.equal(main.margin, '0 auto');
    assert.equal(main['margin-left'], undefined);
    // Navigation is a top bar now: no page reserves a side gutter for it.
    assert.doesNotMatch(source(file), /--nav-rail-width|data-nav-collapsed/);
  });
}
