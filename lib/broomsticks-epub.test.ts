import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
    const chapterName = 'EPUB/text/ch001.xhtml';
    const chapter = documents.get(chapterName)!;
    const storyHeading = [...chapter.querySelectorAll('h2')].find((heading) => heading.textContent === 'Broomsticks')!;
    assert.ok(storyHeading, 'The manuscript story heading is present');
    const story = storyHeading.parentElement!;
    assert.equal(story.id, 'broomsticks-1');
    assert.equal(chapter.querySelector('#broomsticks > h1')?.textContent, 'Broomsticks');
    assert.equal(chapter.querySelector('#about-this-edition > h2')?.textContent, 'About this edition');
    // Heinlein's edition H1 and manuscript H2 have distinct, automatically
    // allocated IDs. The nested story navigation must reach the actual H2.
    const source = readFileSync(path.join(process.cwd(), 'data/subscriber-gifts/broomsticks.md'));
    assert.equal(createHash('sha256').update(source).digest('hex'), 'a120180eb693201efa511abad57637036e0562393955a6bdad9764164ff02b92');
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    // This fixed excerpt uses only emphasis, a heading and a terminal rule.
    // Remove those Markdown delimiters; preserve every prose character.
    const expected = source.toString('utf8').split(/\n\s*\n/)
      .filter((paragraph) => !/^\s*(## |----)/.test(paragraph))
      .map((paragraph) => paragraph.replace(/[_*]/g, '')).join(' ');
    assert.equal(normalize([...story.querySelectorAll('p')].map((paragraph) => paragraph.textContent).join(' ')), normalize(expected));
    const nav = documents.get('EPUB/nav.xhtml')!;
    const storyLinks = [...nav.querySelectorAll('ol ol a')].filter((link) => link.textContent === 'Broomsticks');
    assert.equal(storyLinks.length, 1);
    assert.equal(storyLinks[0].getAttribute('href'), `text/ch001.xhtml#${story.id}`);
    const edition = [...nav.querySelectorAll('a')].find((link) => link.textContent === 'About this edition');
    assert.equal(edition?.getAttribute('href'), 'text/ch001.xhtml#about-this-edition');
    const ncx = documents.get('EPUB/toc.ncx')!;
    for (const [label, fragment] of [['Broomsticks', story.id], ['About this edition', 'about-this-edition']]) {
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
