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

test('produces readable plaintext for teasers', () => {
  assert.equal(markdownToPlaintext('## Hello\n\nRead [this](https://example.test) **now**.'), 'Hello Read this now.');
});
