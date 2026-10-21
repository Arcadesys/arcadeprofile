import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';

test('Broomsticks EPUB IDs are unique and both navigation formats target the intended sections', () => {
  const epub = path.join(process.cwd(), 'public/lead-magnets/broomsticks.epub');
  const names = execFileSync('unzip', ['-Z1', epub], { encoding: 'utf8' }).trim().split('\n');
  const documents = new Map<string, Document>();
  const windows: JSDOM[] = [];
  try {
    for (const name of names.filter((name) => /\.(xhtml|ncx|opf|xml)$/.test(name))) {
      const xml = execFileSync('unzip', ['-p', epub, name], { encoding: 'utf8' });
      const dom = new JSDOM(xml, { contentType: 'application/xml' });
      windows.push(dom);
      const ids = [...dom.window.document.querySelectorAll('[id]')].map((element) => element.id);
      assert.equal(new Set(ids).size, ids.length, `Duplicate IDs in ${name}`);
      documents.set(name, dom.window.document);
    }
    // Every fragment must resolve to exactly one element, not merely exist.
    for (const [name, document] of documents) {
      for (const element of document.querySelectorAll('[href], [src]')) {
        for (const attribute of ['href', 'src']) {
          const href = element.getAttribute(attribute);
          if (!href || /^[a-z][a-z\d+.-]*:/i.test(href)) continue;
          const [relative, fragment] = href.split('#');
          const target = relative ? path.posix.normalize(path.posix.join(path.posix.dirname(name), relative)) : name;
          assert.ok(names.includes(target), `${name}: missing ${href}`);
          if (fragment) {
            const matches = [...documents.get(target)!.querySelectorAll('[id]')].filter((node) => node.id === decodeURIComponent(fragment));
            assert.equal(matches.length, 1, `${name}: ambiguous/missing ${href}`);
          }
        }
      }
    }
    const chapter = documents.get('EPUB/text/ch001.xhtml')!;
    assert.equal(chapter.querySelector('#about-this-edition > h1')?.textContent, 'About this edition');
    assert.equal(chapter.querySelector('#broomsticks > h2')?.textContent, 'Broomsticks');
    assert.match(chapter.querySelector('#broomsticks')!.textContent!, /Broomsticks shared a storefront/);
    const nav = documents.get('EPUB/nav.xhtml')!;
    const storyLinks = [...nav.querySelectorAll('a')].filter((link) => link.textContent === 'Broomsticks');
    assert.equal(storyLinks.length, 1);
    assert.equal(storyLinks[0].getAttribute('href'), 'text/ch001.xhtml#broomsticks');
    const edition = [...nav.querySelectorAll('a')].find((link) => link.textContent === 'About this edition');
    assert.equal(edition?.getAttribute('href'), 'text/ch001.xhtml#about-this-edition');
    const ncx = documents.get('EPUB/toc.ncx')!;
    for (const [label, fragment] of [['Broomsticks', 'broomsticks'], ['About this edition', 'about-this-edition']]) {
      // NCX also labels the separate title page "Broomsticks". Check the actual
      // chapter destination and its label, rather than conflating those entries.
      const destination = `text/ch001.xhtml#${fragment}`;
      const points = [...ncx.querySelectorAll('navPoint')].filter((point) => [...point.children]
        .some((child) => child.localName === 'content' && child.getAttribute('src') === destination));
      assert.equal(points.length, 1);
      assert.equal(points[0].querySelector('navLabel > text')?.textContent, label);
    }
  } finally {
    for (const dom of windows) dom.window.close();
  }
});
