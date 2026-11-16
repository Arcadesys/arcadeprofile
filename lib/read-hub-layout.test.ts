import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss from 'postcss';

const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), 'utf8');
const cssPath = 'app/(frontend)/writing/writing.module.css';
const css = read(cssPath);
const styles = postcss.parse(css);

function declarationsFor(selector: string): Record<string, string> {
  const values: Record<string, string> = {};
  styles.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) return;
    rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test('the door edges run cyan, pink, orange, pale blue in door order', () => {
  // The heading is the section's first child, so :nth-child would colour the links one place early.
  assert.doesNotMatch(css, /\.doors a:nth-child/);
  assert.match(declarationsFor('.doors a')['border-top'], /var\(--cyan\)/);
  assert.equal(declarationsFor('.doors a:nth-of-type(2)')['border-top-color'], 'var(--pink)');
  assert.equal(declarationsFor('.doors a:nth-of-type(3)')['border-top-color'], 'var(--accent)');
  assert.equal(declarationsFor('.doors a:nth-of-type(4)')['border-top-color'], '#aee7f4');
});

test('there are at most four doors, each a single link with an Enter line', () => {
  const page = read('app/(frontend)/writing/page.tsx');
  const doors = page.match(/\{ title: '[^']+', href: '[^']+', description: /g) ?? [];
  assert.ok(doors.length >= 1 && doors.length <= 4, 'a fifth section means the hub needs regrouping, not a third row');
  assert.match(page, /<em>Enter <span aria-hidden="true">→<\/span><\/em>/);
});

test('the hub uses the console border token and leaves focus to the global ring', () => {
  assert.equal(declarationsFor('.doors').border, '1px solid var(--console-border)');
  assert.match(declarationsFor('.doors a').border, /^2px solid var\(--console-border\)/);
  assert.doesNotMatch(css, /#35353a|#51484d/, 'use --console-border instead of the hard-coded greys');
  assert.doesNotMatch(css, /:focus-visible/, 'the global 4px white focus ring applies; do not restyle it per page');
});

test('door targets and text keep the design system floors', () => {
  assert.equal(declarationsFor('.doors em')['min-height'], '44px');
  assert.ok(Number.parseFloat(declarationsFor('.doors span')['font-size']) >= 1);
  assert.ok(Number.parseFloat(declarationsFor('.doors em')['font-size']) >= 1);
});

test('the hub is called Read everywhere it names itself, matching the rail', () => {
  const page = read('app/(frontend)/writing/page.tsx');
  assert.match(page, /title: 'Read',/);
  assert.match(page, /<h1>Read<\/h1>/);
  assert.equal((page.match(/Read \| \$\{SITE_NAME\}/g) ?? []).length, 2, 'Open Graph and Twitter titles');
  assert.doesNotMatch(page, /Writing \|/);
  // The rail's label for /writing is the single source of the name.
  const rail = read('lib/nav-items.ts').match(/label: '([^']+)', href: '\/writing'/);
  assert.equal(rail?.[1], 'Read');
  // The Queer Columns breadcrumb links back to this hub by the same name.
  assert.match(read('app/(frontend)/queercolumns/page.tsx'), /<Link href="\/writing">Read<\/Link>/);
});
