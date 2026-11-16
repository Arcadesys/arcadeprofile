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

test('there are at most four doors, each a single link with an Enter line', () => {
  const page = read('app/(frontend)/writing/page.tsx');
  const doors = page.match(/\{ title: '[^']+', href: '[^']+', description: /g) ?? [];
  assert.ok(doors.length >= 1 && doors.length <= 4, 'a fifth section means the hub needs regrouping, not a third row');
  assert.match(page, /<em>Enter <span aria-hidden="true">→<\/span><\/em>/);
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
