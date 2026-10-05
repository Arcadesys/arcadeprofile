import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import MarkdownPostBody from '../app/components/MarkdownPostBody';
import { canonicalDiscoveryHref } from './post-canonical';
import { getReadingCatalog } from './reading-catalog';
import { nextPiece } from './reading-continuity';
import { ZOO_COLLECTION_DESCRIPTION } from './zoo-collection-meta';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('Bunch renders one clean technical-case link in the existing Explore Bunch section', () => {
  const markdown = source('content/posts/bunch/bunch.md');
  const html = renderToStaticMarkup(createElement(MarkdownPostBody, { markdown }));
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const href = 'https://work.thearcades.me/work/bunch';
  const links = document.querySelectorAll(`a[href="${href}"]`);
  assert.equal(links.length, 1);
  const link = links[0];
  assert.equal(link.textContent, 'Bunch: a context system for continuity across memory gaps');
  assert.equal(link.hasAttribute('target'), false);
  assert.equal(new URL(link.getAttribute('href')!).search, '');
  assert.equal(link.parentElement?.tagName, 'P');
  assert.equal(link.parentElement?.previousElementSibling?.textContent, 'Explore Bunch');
  assert.equal(link.parentElement?.nextElementSibling?.querySelector('a')?.getAttribute('href'), 'https://system.thearcades.me/');
  dom.window.close();
});

test('Zoo keeps the exact approved visible copy beside the existing actions and edition count', () => {
  const page = source('app/(frontend)/novels/it-takes-a-zoo/page.tsx');
  const synopsis = 'Jamie discovers the Zoo, a private virtual world where people choose their bodies and make room for each other. Follow its queer, furry found family through connected stories of art, grief, consent, and the work of building a place to belong.';
  const editionNote = 'The combined PDF is a fixed edition; individual chapters may include later revisions.';
  assert.equal(page.split(synopsis).length - 1, 1);
  assert.ok(page.includes(`<p>${synopsis}</p>`));
  const lede = page.indexOf('<p className={styles.lede}>{ZOO_COLLECTION_DESCRIPTION}</p>');
  const introduction = page.indexOf(synopsis);
  const actions = page.indexOf('<div className={styles.actions}>');
  assert.ok(lede !== -1 && lede < introduction && introduction < actions);
  assert.ok(page.includes(`published chapters as one large-print, high-contrast edition. The opening poem remains separate. ${editionNote}</p>`));
  assert.ok(page.includes('download all {ZOO_CHAPTERS.length} published chapters'));
  assert.equal(ZOO_COLLECTION_DESCRIPTION, 'A novel-in-stories about escaping the hypercapitalist grind.');
  assert.equal(page.split(editionNote).length - 1, 1);
});

test('reader copy leaves canonical discovery and local sequential reading distinct', async () => {
  const catalog = await getReadingCatalog();
  const myBrain = catalog.find((piece) => piece.canonicalPath === '/projects/arcade-blog/my-brain-was-built-for-this');
  const coldBoot = catalog.find((piece) => piece.canonicalPath === '/novels/it-takes-a-zoo/cold-boot');
  assert.ok(myBrain && coldBoot);
  assert.equal(nextPiece(myBrain, catalog)?.canonicalPath, '/projects/arcade-blog/four-stages-nobody-tells-you-about');
  assert.equal(nextPiece(coldBoot, catalog)?.canonicalPath, '/novels/it-takes-a-zoo/gallery-view');
  assert.equal(canonicalDiscoveryHref('/projects/bunch/bunch'), '/projects/bunch/bunch');
  assert.equal(canonicalDiscoveryHref('/projects/arcade-blog/four-stages-nobody-tells-you-about'), '/projects/arcade-blog/four-stages-nobody-tells-you-about');
});
