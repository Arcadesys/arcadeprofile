import assert from 'node:assert/strict';
import test from 'node:test';

import { markdownToPlaintext, markdownToSafeHtml } from './markdown-render';

test('renders semantic Markdown while escaping raw HTML and unsafe links', () => {
  const html = markdownToSafeHtml('# Title\n\nA **bold** [link](https://example.test).\n\n- One\n- Two\n\n<script>alert(1)</script> [bad](javascript:alert(1))');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<ul><li>One<\/li><li>Two<\/li><\/ul>/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test('renders underscore emphasis and accessible privacy-enhanced YouTube embeds', () => {
  const markdown = 'The _makura_ says _come with me._ Keep foo_bar_baz literal and [this URL](https://example.test/path-_alpha_/?q=_beta_). `code_with_underscores` ![_alt_](https://example.test/_image_).\n\n@[youtube](jm1j_kY89Q4 "Watch Katsura Sunshine explain the idea.")';
  const html = markdownToSafeHtml(markdown, { allowEmbeds: true });
  assert.match(html, /<em>makura<\/em>/);
  assert.match(html, /<em>come with me\.<\/em>/);
  assert.match(html, /foo_bar_baz/);
  assert.match(html, /href="https:\/\/example\.test\/path-_alpha_\/\?q=_beta_"/);
  assert.match(html, /<code>code_with_underscores<\/code>/);
  assert.match(html, /<img src="https:\/\/example\.test\/_image_" alt="_alt_" \/>/);
  assert.match(html, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/jm1j_kY89Q4"/);
  assert.match(html, /title="Watch Katsura Sunshine explain the idea\."/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/);
  assert.match(html, /allowfullscreen/);
  assert.match(html, /href="https:\/\/www\.youtube\.com\/shorts\/jm1j_kY89Q4"[^>]*>Watch Katsura Sunshine explain the idea\.<\/a>/);
  assert.doesNotMatch(markdownToSafeHtml('@[youtube](not-a-valid-id)'), /<iframe/);
  const fallback = markdownToSafeHtml(markdown);
  assert.doesNotMatch(fallback, /<iframe/);
  assert.match(fallback, /<p><a href="https:\/\/www\.youtube\.com\/shorts\/jm1j_kY89Q4"[^>]*>Watch Katsura Sunshine explain the idea\.<\/a><\/p>/);
  assert.equal(markdownToPlaintext(markdown).endsWith('Watch Katsura Sunshine explain the idea.'), true);
});

test('produces readable plaintext for teasers', () => {
  assert.equal(markdownToPlaintext('## Hello\n\nRead [this](https://example.test) **now**.'), 'Hello Read this now.');
});
