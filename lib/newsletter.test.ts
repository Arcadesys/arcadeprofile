import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPostNewsletterContent } from './newsletter';

test('buildPostNewsletterContent renders Markdown and the canonical essay URL', () => {
  const result = buildPostNewsletterContent({
    title: 'A Small Test',
    slug: 'a-small-test',
    excerpt: 'The excerpt.',
    markdownBody: '## Hello\n\nA **bold** paragraph.',
    group: { slug: 'arcade-blog', title: 'Arcade Blog' },
  }, 'https://thearcades.me');

  assert.match(result.htmlBody, /<h2>Hello<\/h2>/);
  assert.match(result.htmlBody, /<strong>bold<\/strong>/);
  assert.match(result.htmlBody, /https:\/\/thearcades\.me\/projects\/arcade-blog\/a-small-test/);
  assert.match(result.textBody, /A bold paragraph\./);
  assert.doesNotMatch(result.htmlBody, /Lexical|Payload/);
});

test('buildPostNewsletterContent prefers a post hero and escapes its alt text', () => {
  const result = buildPostNewsletterContent({
    title: 'Hero',
    slug: 'hero',
    markdownBody: 'Body.',
    hero: { src: '/hero.png', alt: 'A <bright> image' },
    group: { slug: 'arcade-blog', image: '/group.png' },
  }, 'https://thearcades.me');

  assert.match(result.htmlBody, /src="https:\/\/thearcades\.me\/hero\.png"/);
  assert.match(result.htmlBody, /alt="A &lt;bright&gt; image"/);
  assert.doesNotMatch(result.htmlBody, /group\.png/);
});
