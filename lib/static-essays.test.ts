import assert from 'node:assert/strict';
import test from 'node:test';
import { convertPayloadEssay } from './payload-essay-import';

test('Payload essay conversion preserves semantic text and never emits Payload media URLs', () => {
  const converted = convertPayloadEssay({
    id: 42, slug: 'a-test-essay', title: 'A Test Essay', excerpt: 'Summary',
    publishedDate: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T01:00:00.000Z',
    publish_status: 'published', group: 'arcade-blog', tags: [{ tag: 'AI' }],
    content: { root: { children: [
      { type: 'heading', fields: { tag: 'h2' }, children: [{ type: 'text', text: 'Heading' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Read ' }, { type: 'link', url: 'https://example.test', children: [{ type: 'text', text: 'this' }] }] },
      { type: 'upload', fields: { id: 99, alt: 'A chart', url: '/api/media/file.png' } },
      { type: 'youtube', fields: { videoId: 'abc123', caption: 'Watch' } },
    ] } },
  }, 'Arcade Blog');
  assert.match(converted.markdown, /## Heading/);
  assert.match(converted.markdown, /\[this\]\(https:\/\/example\.test\)/);
  assert.match(converted.markdown, /Media migration required/);
  assert.match(converted.markdown, /Payload upload 99/);
  assert.match(converted.markdown, /youtube\.com/);
  assert.doesNotMatch(converted.markdown, /\/api\/media\//);
});

test('Payload essay conversion handles saved YouTube blocks and fails closed for unknown nodes', () => {
  const converted = convertPayloadEssay({
    id: 43, slug: 'youtube-block', title: 'YouTube Block', publishedDate: '2026-08-20', publish_status: 'published', group: 'arcade-blog',
    content: { root: { children: [{ type: 'block', fields: { blockType: 'youtube', videoId: 'abc123' } }] } },
  }, 'Arcade Blog');
  assert.match(converted.markdown, /youtube\.com\/watch\?v=abc123/);
  assert.throws(() => convertPayloadEssay({
    id: 44, slug: 'unknown-node', title: 'Unknown Node', publishedDate: '2026-08-20', publish_status: 'published', group: 'arcade-blog',
    content: { root: { children: [{ type: 'table', children: [] }] } },
  }, 'Arcade Blog'), /Unsupported Payload Lexical node: table/);
});

test('Payload essay conversion fails closed for an unsupported writing group', () => {
  assert.throws(() => convertPayloadEssay({
    id: 1, slug: 'wrong-group', title: 'Wrong', publishedDate: '2026-01-01', publish_status: 'published', group: 'not-essays', content: { root: { children: [] } },
  }, 'Wrong'));
});
