import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLlmsIndex } from './llms';

test('llms index uses canonical URLs and only supplied public entries', () => {
  const index = buildLlmsIndex('https://www.thearcades.me/', [
    { slug: 'field-notes', title: 'Field Notes', description: 'Project writing.', filePath: 'fixture' },
  ], [
    {
      id: 'public-entry', title: 'Public Entry', slug: 'public-entry', group: 'field-notes',
      publishDate: '2020-01-01T00:00:00Z', excerpt: 'A public summary.', body: 'Public body.', filePath: 'fixture',
    },
  ]);

  assert.match(index, /\[Field Notes\]\(https:\/\/www\.thearcades\.me\/projects\/field-notes\): Project writing\./);
  assert.match(index, /\[Public Entry\]\(https:\/\/www\.thearcades\.me\/projects\/field-notes\/public-entry\): A public summary\./);
  assert.match(index, /https:\/\/www\.thearcades\.me\/sitemap\.xml/);
  assert.doesNotMatch(index, /Future Entry/);
});
