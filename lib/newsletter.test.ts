import assert from 'node:assert/strict';
import test from 'node:test';
import type { SerializedEditorState } from 'lexical';

import { buildPostNewsletterContent } from './newsletter';

const SITE_URL = 'https://thearcades.me';

const EMPTY_LEXICAL: SerializedEditorState = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: [],
    direction: null,
  } as unknown as SerializedEditorState['root'],
};

function basePost(overrides: Partial<Parameters<typeof buildPostNewsletterContent>[0]> = {}) {
  return {
    slug: 'post',
    title: 'Post',
    excerpt: 'short',
    content: EMPTY_LEXICAL,
    ...overrides,
  };
}

test('renders the post meta.image as the hero when populated', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      title: 'Hello',
      meta: { image: { url: 'https://cdn.example/hero.jpg', alt: 'Hero alt' } },
    }),
    SITE_URL,
  );

  assert.match(htmlBody, /<img[^>]+src="https:\/\/cdn\.example\/hero\.jpg"/);
  assert.match(htmlBody, /alt="Hero alt"/);
  // Hero must precede the title.
  assert.ok(htmlBody.indexOf('<img') < htmlBody.indexOf('<h1'));
});

test('falls back to the post title when meta.image has no alt', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      title: 'Hello',
      meta: { image: { url: '/api/media/file/h.jpg' } },
    }),
    SITE_URL,
  );

  assert.match(htmlBody, /alt="Hello"/);
});

test('makes a relative meta.image url absolute against the site url', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      meta: { image: { url: '/api/media/file/h.jpg', alt: 'A' } },
    }),
    SITE_URL,
  );

  assert.match(htmlBody, /src="https:\/\/thearcades\.me\/api\/media\/file\/h\.jpg"/);
});

test('falls back to group.image when meta.image is absent', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      title: 'Chapter 3',
      meta: null,
      group: { image: 'https://cdn.example/series.jpg', title: 'Series' },
    }),
    SITE_URL,
  );

  assert.match(htmlBody, /src="https:\/\/cdn\.example\/series\.jpg"/);
  assert.match(htmlBody, /alt="Series"/);
});

test('falls back to group.image when meta.image is an unpopulated id', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      meta: { image: 42 },
      group: { image: 'https://cdn.example/series.jpg', title: 'Series' },
    }),
    SITE_URL,
  );

  assert.match(htmlBody, /src="https:\/\/cdn\.example\/series\.jpg"/);
});

test('uses post.title as alt for the group fallback when group.title is empty', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      title: 'Chapter 3',
      group: { image: 'https://cdn.example/series.jpg' },
    }),
    SITE_URL,
  );

  assert.match(htmlBody, /alt="Chapter 3"/);
});

test('renders no hero img when neither meta.image nor group.image is set', () => {
  const { htmlBody } = buildPostNewsletterContent(basePost(), SITE_URL);
  assert.doesNotMatch(htmlBody, /<img/);
});

test('escapes hero src and alt to avoid breaking the surrounding HTML', () => {
  const { htmlBody } = buildPostNewsletterContent(
    basePost({
      meta: {
        image: {
          url: 'https://cdn.example/h.jpg?a=1&b="evil"',
          alt: 'a"b<c',
        },
      },
    }),
    SITE_URL,
  );

  assert.doesNotMatch(htmlBody, /a=1&b="evil"/);
  assert.match(htmlBody, /a=1&amp;b=&quot;evil&quot;/);
  assert.match(htmlBody, /alt="a&quot;b&lt;c"/);
});
