import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SHELF_NAMES } from '../data/bookshelf';

const bookshelfPage = readFileSync('app/(frontend)/bookshelf/page.tsx', 'utf8');
const welcomePage = readFileSync('app/(frontend)/welcome/page.tsx', 'utf8');

const allLinks = SHELF_NAMES.flatMap((group) => [
  ...group.findMe,
  ...group.lists.flatMap((list) => list.entries.flatMap((entry) => entry.links ?? [])),
]);

test('the shared shelf covers all three pen names', () => {
  assert.deepEqual(SHELF_NAMES.map((group) => group.name), ['As Austen Tucker', 'As Slyford T. Rabbit', 'As Sly Rabbit']);
});

test('every shelf link on /welcome is also on /bookshelf, so the two pages stay in step', () => {
  for (const link of allLinks) {
    assert.ok(bookshelfPage.includes(`href="${link.href}"`), link.href);
  }
});

test('every external link on /bookshelf is in the shared shelf', () => {
  const shelfHrefs = new Set(allLinks.map((link) => link.href));
  const pageHrefs = [...bookshelfPage.matchAll(/<Ext href="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(pageHrefs.length > 20);
  for (const href of pageHrefs) assert.ok(shelfHrefs.has(href), href);
});

test('every shelf link has words, not just an icon', () => {
  for (const link of allLinks) assert.ok(link.label.trim().length > 2, link.href);
});

test('welcome shows the books and the shared shelf in its own labeled section', () => {
  assert.match(welcomePage, /aria-labelledby="welcome-bookshelf-heading"/);
  assert.match(welcomePage, /id="welcome-bookshelf-heading">My bookshelf</);
  assert.match(welcomePage, /BOOKS\.map/);
  assert.match(welcomePage, /SHELF_NAMES\.map/);
  assert.match(welcomePage, /href=\{bookPath\(book\)\}/);
});

test('the welcome shelf shows Austen Tucker, not Austen Crowder, in visible text', () => {
  for (const group of SHELF_NAMES) {
    assert.doesNotMatch(group.name, /Crowder/);
    for (const link of group.findMe) assert.doesNotMatch(link.label, /crowder/i);
    for (const list of group.lists) {
      for (const entry of list.entries) {
        assert.doesNotMatch(entry.title, /Crowder/);
        assert.doesNotMatch(entry.detail, /Crowder/);
        for (const link of entry.links ?? []) assert.doesNotMatch(link.label, /crowder/i);
      }
    }
  }
});
