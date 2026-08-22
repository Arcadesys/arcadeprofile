import assert from 'node:assert/strict';
import test from 'node:test';

import { editorialEtag, editorialPdfFilename, editorialPdfFooter } from '@/lib/editorial-pdf';
import { markdownToEditorialBlocks, type EditorialPiece } from '@/lib/editorial-piece';

test('editorial Markdown IR retains readable headings, paragraphs, quotes, and lists', () => {
  assert.deepEqual(markdownToEditorialBlocks('# Heading\n\nHello **world**.\n\n> A quote\n\n- One\n- Two'), [
    { type: 'heading', level: 2, text: 'Heading' },
    { type: 'paragraph', text: 'Hello world.' },
    { type: 'quote', text: 'A quote' },
    { type: 'list', ordered: false, items: ['One', 'Two'] },
  ]);
});

test('PDF filenames and cache validators are stable for a normalized piece', () => {
  const piece: EditorialPiece = {
    id: 'post:1', kind: 'post', title: 'The Long Way Home', description: 'A test.', author: 'Austen Tucker',
    canonicalPath: '/projects/test/the-long-way-home', pdfPath: '/projects/test/the-long-way-home/pdf', blocks: [{ type: 'paragraph', text: 'Hello.' }],
  };
  assert.equal(editorialPdfFilename(piece), 'the-long-way-home.pdf');
  assert.equal(editorialEtag(piece), editorialEtag(piece));
  assert.equal(editorialPdfFooter(piece), "The Arcades' Lab · /projects/test/the-long-way-home");
});
