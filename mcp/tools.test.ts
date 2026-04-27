/**
 * Unit tests for mcp/tools.ts
 *
 * Run with: pnpm exec tsx --test "mcp/**\/*.test.ts"
 *
 * fetch is monkey-patched per test so no real HTTP requests are made.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchFn = typeof globalThis.fetch;

/** Replace global fetch for the duration of a test, then restore it. */
function mockFetch(implementation: FetchFn): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  return () => {
    globalThis.fetch = original;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Import tools module (after patching env so BASE_URL is predictable)
// ---------------------------------------------------------------------------

process.env.PAYLOAD_API_URL = 'http://localhost:3000';
process.env.PAYLOAD_API_KEY = 'test-api-key';

// Dynamic import so env is set before module-level code runs in tools.ts
const { toolDefinitions, toolHandlers, markdownToLexical } = await import('./tools.js');

// ---------------------------------------------------------------------------
// toolDefinitions
// ---------------------------------------------------------------------------

test('toolDefinitions includes all expected tool names', () => {
  const names = toolDefinitions.map((t) => t.name);
  const expected = [
    'list_posts',
    'get_post',
    'create_post',
    'update_post',
    'list_pages',
    'get_page',
    'update_page',
    'list_groups',
    'list_books',
    'list_projects',
  ];
  for (const name of expected) {
    assert.ok(names.includes(name), `Missing tool: ${name}`);
  }
});

test('create_post schema has required fields: title, excerpt, content', () => {
  const tool = toolDefinitions.find((t) => t.name === 'create_post');
  assert.ok(tool, 'create_post tool not found');
  const schema = tool.inputSchema as { required: string[] };
  assert.deepEqual(schema.required.sort(), ['content', 'excerpt', 'title']);
});

test('create_post schema includes meta and discoverability', () => {
  const tool = toolDefinitions.find((t) => t.name === 'create_post');
  assert.ok(tool);
  const props = (tool.inputSchema as { properties: Record<string, unknown> }).properties;
  assert.ok(props.meta, 'meta missing from create_post schema');
  assert.ok(props.discoverability, 'discoverability missing from create_post schema');
  assert.ok(props.skipNewsletter, 'skipNewsletter missing from create_post schema');
  assert.ok(props.tags, 'tags missing from create_post schema');
  assert.ok(props.publish_status, 'publish_status missing from create_post schema');
});

test('update_post schema requires slug', () => {
  const tool = toolDefinitions.find((t) => t.name === 'update_post');
  assert.ok(tool);
  const schema = tool.inputSchema as { required: string[] };
  assert.ok(schema.required.includes('slug'));
});

// ---------------------------------------------------------------------------
// markdownToLexical
// ---------------------------------------------------------------------------

test('markdownToLexical wraps paragraphs in root node', async () => {
  const mockLexical = {
    root: {
      children: [
        { children: [{ text: 'Hello world' }] },
        { children: [{ text: 'Second paragraph' }] },
      ],
    },
  };
  const restore = mockFetch(async () => jsonResponse({ lexical: mockLexical }));
  try {
    const result = (await markdownToLexical('Hello world\n\nSecond paragraph')) as {
      root: { children: { children: { text: string }[] }[] };
    };
    assert.equal(result.root.children.length, 2);
    assert.equal(result.root.children[0].children[0].text, 'Hello world');
    assert.equal(result.root.children[1].children[0].text, 'Second paragraph');
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// list_posts handler
// ---------------------------------------------------------------------------

test('list_posts returns shaped post objects', async () => {
  const restore = mockFetch(async () =>
    jsonResponse({
      docs: [
        {
          id: 1,
          title: 'Test Post',
          slug: 'test-post',
          group: null,
          _status: 'published',
          publish_status: 'sent',
          publishedDate: '2026-01-01',
          excerpt: 'Excerpt here',
        },
      ],
    }),
  );

  try {
    const result = await toolHandlers.list_posts({});
    assert.equal(result.content[0].type, 'text');
    const posts = JSON.parse(result.content[0].text as string) as {
      slug: string;
      status: string;
      publish_status: string;
    }[];
    assert.equal(posts.length, 1);
    assert.equal(posts[0].slug, 'test-post');
    assert.equal(posts[0].status, 'published');
    assert.equal(posts[0].publish_status, 'sent');
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// create_post handler
// ---------------------------------------------------------------------------

test('create_post sends tags as array-of-objects to Payload', async () => {
  let capturedBody: Record<string, unknown> = {};

  const restore = mockFetch(async (_url, opts) => {
    capturedBody = JSON.parse((opts?.body as string) ?? '{}') as Record<string, unknown>;
    return jsonResponse({ doc: { slug: 'my-post' } });
  });

  try {
    const result = await toolHandlers.create_post({
      title: 'My Post',
      excerpt: 'Short.',
      content: 'Body text.',
      tags: ['ai', 'tech'],
      skipNewsletter: true,
      meta: { title: 'SEO Title', description: 'SEO desc', keywords: 'ai,tech' },
      discoverability: { social_hook: 'Check this out', search_summary: 'Summary here.' },
    });

    // tags serialized correctly
    assert.deepEqual(capturedBody.tags, [{ tag: 'ai' }, { tag: 'tech' }]);

    // skipNewsletter sets newsletterSent
    assert.equal(capturedBody.newsletterSent, true);

    // meta passes through
    const meta = capturedBody.meta as Record<string, string>;
    assert.equal(meta.title, 'SEO Title');
    assert.equal(meta.description, 'SEO desc');

    // discoverability gets default canonical_path
    const disc = capturedBody.discoverability as Record<string, unknown>;
    assert.ok(
      (disc.canonical_path as string).startsWith('/blog/'),
      'canonical_path should default to /blog/{slug}',
    );

    // defaults to draft
    assert.equal(capturedBody._status, 'draft');
    assert.equal(capturedBody.publish_status, 'draft');

    // response text
    const item0 = result.content[0];
    assert.ok(item0.type === 'text' && item0.text.startsWith('Created post:'));
  } finally {
    restore();
  }
});

test('create_post sets _status=published when publish_status=published', async () => {
  let capturedBody: Record<string, unknown> = {};

  const restore = mockFetch(async (_url, opts) => {
    capturedBody = JSON.parse((opts?.body as string) ?? '{}') as Record<string, unknown>;
    return jsonResponse({ doc: { slug: 'live-post' } });
  });

  try {
    await toolHandlers.create_post({
      title: 'Live Post',
      excerpt: 'Going live.',
      content: 'Content.',
      publish_status: 'published',
    });
    assert.equal(capturedBody._status, 'published');
    assert.equal(capturedBody.publish_status, 'published');
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// update_post handler
// ---------------------------------------------------------------------------

test('update_post returns not-found message when post missing', async () => {
  const restore = mockFetch(async () => jsonResponse({ docs: [] }));

  try {
    const result = await toolHandlers.update_post({ slug: 'ghost-post' });
    const item = result.content[0];
    assert.ok(item.type === 'text' && item.text === 'Post not found.');
  } finally {
    restore();
  }
});

test('update_post syncs _status when publish_status changes', async () => {
  let patchBody: Record<string, unknown> = {};
  let callCount = 0;

  const restore = mockFetch(async (_url, opts) => {
    callCount++;
    if (callCount === 1) {
      // find by slug
      return jsonResponse({ docs: [{ id: 42 }] });
    }
    // PATCH
    patchBody = JSON.parse((opts?.body as string) ?? '{}') as Record<string, unknown>;
    return jsonResponse({ doc: { slug: 'draft-post' } });
  });

  try {
    await toolHandlers.update_post({ slug: 'draft-post', publish_status: 'published' });
    assert.equal(patchBody._status, 'published');
    assert.equal(patchBody.publish_status, 'published');
  } finally {
    restore();
  }
});

test('update_post serializes tags array-of-objects', async () => {
  let patchBody: Record<string, unknown> = {};
  let callCount = 0;

  const restore = mockFetch(async (_url, opts) => {
    callCount++;
    if (callCount === 1) return jsonResponse({ docs: [{ id: 7 }] });
    patchBody = JSON.parse((opts?.body as string) ?? '{}') as Record<string, unknown>;
    return jsonResponse({ doc: { slug: 'tagged-post' } });
  });

  try {
    await toolHandlers.update_post({ slug: 'tagged-post', tags: ['music', 'chicago'] });
    assert.deepEqual(patchBody.tags, [{ tag: 'music' }, { tag: 'chicago' }]);
  } finally {
    restore();
  }
});
