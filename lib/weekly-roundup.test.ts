import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildWeeklyRoundupContent,
  type RoundupPost,
  type RoundupStream,
} from './weekly-roundup';

const week = {
  weekStart: new Date('2026-05-01T00:00:00Z'),
  weekEnd: new Date('2026-05-08T00:00:00Z'),
};

function makePost(overrides: Partial<RoundupPost> = {}): RoundupPost {
  return {
    slug: 'test-post',
    title: 'Test Post',
    excerpt: 'A short excerpt.',
    publishedDate: '2026-05-05T12:00:00Z',
    group: { slug: 'a-group', title: 'A Group', image: null },
    partIndex: 1,
    ...overrides,
  };
}

function build(stream: RoundupStream, posts: RoundupPost[]) {
  return buildWeeklyRoundupContent({
    stream,
    posts,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    siteUrl: 'https://example.com',
  });
}

test('subject embeds stream label and date range', () => {
  const r = build('fiction', [makePost()]);
  assert.match(r.subject, /Fiction this week — May 1, 2026–May 8, 2026/);
  const e = build('essays', [makePost()]);
  assert.match(e.subject, /Essays this week — May 1, 2026–May 8, 2026/);
});

test('html includes one <article> per post (plus the wrapping <article>)', () => {
  const r = build('fiction', [
    makePost({ slug: 'one', title: 'One' }),
    makePost({ slug: 'two', title: 'Two' }),
    makePost({ slug: 'three', title: 'Three' }),
  ]);
  // 1 wrapping article + 3 post articles = 4
  const articleCount = (r.htmlBody.match(/<article/g) || []).length;
  assert.equal(articleCount, 4);
  for (const t of ['One', 'Two', 'Three']) {
    assert.ok(r.htmlBody.includes(t), `html missing post title: ${t}`);
  }
});

test('post links use canonical /projects/<group>/<part> URL when partIndex is set', () => {
  const r = build('fiction', [
    makePost({ slug: 'whatever', group: { slug: 'la-ligne', title: 'La Ligne' }, partIndex: 3 }),
  ]);
  assert.ok(
    r.htmlBody.includes('https://example.com/projects/la-ligne/03'),
    'expected canonical group URL with zero-padded part',
  );
});

test('post links fall back to /projects when partIndex is missing or 0', () => {
  const r = build('essays', [makePost({ partIndex: null, group: null })]);
  assert.ok(
    r.htmlBody.includes('https://example.com/projects'),
    'expected /projects fallback link',
  );
  assert.ok(!r.htmlBody.includes('/projects/'));
});

test('html escapes title, excerpt, and group title', () => {
  const r = build('fiction', [
    makePost({
      title: 'Quotes & "Co"',
      excerpt: '<script>alert(1)</script>',
      group: { slug: 'g', title: '<b>Group</b>', image: null },
      partIndex: 1,
    }),
  ]);
  assert.ok(!r.htmlBody.includes('<script>alert(1)</script>'), 'script tag was not escaped');
  assert.ok(r.htmlBody.includes('&lt;script&gt;'), 'expected escaped excerpt');
  assert.ok(r.htmlBody.includes('Quotes &amp; &quot;Co&quot;'), 'expected escaped title');
  assert.ok(r.htmlBody.includes('&lt;b&gt;Group&lt;/b&gt;'), 'expected escaped group title');
});

test('text body lists posts with title, excerpt, and read URL', () => {
  const r = build('fiction', [
    makePost({ slug: 'a', title: 'Alpha', excerpt: 'first', group: { slug: 'g', title: 'G' }, partIndex: 1 }),
    makePost({ slug: 'b', title: 'Beta', excerpt: 'second', group: { slug: 'g', title: 'G' }, partIndex: 2 }),
  ]);
  assert.ok(r.textBody.includes('Alpha'));
  assert.ok(r.textBody.includes('first'));
  assert.ok(r.textBody.includes('Beta'));
  assert.ok(r.textBody.includes('https://example.com/projects/g/01'));
  assert.ok(r.textBody.includes('https://example.com/projects/g/02'));
});

test('empty post list still produces valid html and subject (caller decides to skip)', () => {
  const r = build('fiction', []);
  assert.ok(r.subject.includes('Fiction this week'));
  assert.ok(r.htmlBody.includes('Fiction this week'));
  // No <article> tags from posts — only the wrapping article.
  assert.equal((r.htmlBody.match(/<article/g) || []).length, 1);
});

test('group title is omitted from html when group is null', () => {
  const r = build('essays', [makePost({ group: null, partIndex: null })]);
  // The header always includes a date-range pill with uppercase styling, so
  // we can't grep for that. Instead assert no per-post meta appears: only
  // post titles and the "Read on the site" link should be in the post block.
  // The group-title spot uses `letter-spacing: 0.05em` (the per-post meta);
  // the header uses `0.08em`. Absence of the per-post letter-spacing is the
  // signal that no group label was rendered.
  assert.ok(!r.htmlBody.includes('letter-spacing: 0.05em'));
});
