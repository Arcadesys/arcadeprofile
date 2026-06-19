/**
 * Unit tests for mcp/tools.ts
 *
 * Run with: npx tsx --test mcp/*.test.ts
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
const { toolDefinitions, toolHandlers, markdownToLexical, payloadQueryPath, TOOL_SCOPES } =
  await import('./tools.js');

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

test('skipNewsletter schema describes scheduled Postmark suppression', () => {
  for (const toolName of ['create_post', 'update_post']) {
    const tool = toolDefinitions.find((t) => t.name === toolName);
    assert.ok(tool, `${toolName} tool not found`);
    const props = (tool.inputSchema as { properties: Record<string, { description?: string }> })
      .properties;
    const description = props.skipNewsletter?.description ?? '';
    assert.match(description, /suppressNewsletter=true/);
    assert.match(description, /Postmark/);
    assert.doesNotMatch(description, /afterChange|fan-out/);
  }
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
// payloadQueryPath
// ---------------------------------------------------------------------------

test('payloadQueryPath encodes nested where query values', () => {
  const path = payloadQueryPath('posts', {
    'where[slug][equals]': 'one & two',
    limit: 1,
    depth: 0,
  });

  assert.equal(
    path,
    '/posts?where%5Bslug%5D%5Bequals%5D=one+%26+two&limit=1&depth=0',
  );
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
      publish_status: string;
    }[];
    assert.equal(posts.length, 1);
    assert.equal(posts[0].slug, 'test-post');
    assert.equal(posts[0].publish_status, 'sent');
  } finally {
    restore();
  }
});

test('list_posts encodes status filter through structured query helper', async () => {
  let capturedUrl = '';
  const restore = mockFetch(async (url) => {
    capturedUrl = String(url);
    return jsonResponse({ docs: [] });
  });

  try {
    await toolHandlers.list_posts({ status: 'sent' });
    const parsed = new URL(capturedUrl);
    assert.equal(parsed.pathname, '/api/posts');
    assert.equal(parsed.searchParams.get('where[publish_status][equals]'), 'sent');
  } finally {
    restore();
  }
});

test('get_post encodes slugs before querying Payload', async () => {
  let capturedUrl = '';
  const restore = mockFetch(async (url) => {
    capturedUrl = String(url);
    return jsonResponse({ docs: [] });
  });

  try {
    await toolHandlers.get_post({ slug: 'odd & slug' });
    const parsed = new URL(capturedUrl);
    assert.equal(parsed.pathname, '/api/posts');
    assert.equal(parsed.searchParams.get('where[slug][equals]'), 'odd & slug');
    assert.equal(parsed.searchParams.get('limit'), '1');
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
    return jsonResponse({ doc: { id: 123, slug: 'my-post' } });
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

    // skipNewsletter sets suppressNewsletter
    assert.equal(capturedBody.suppressNewsletter, true);

    // meta passes through
    const meta = capturedBody.meta as Record<string, string>;
    assert.equal(meta.title, 'SEO Title');
    assert.equal(meta.description, 'SEO desc');

    // discoverability is passed through verbatim — canonical_path is no
    // longer auto-defaulted (raw `order` ≠ part number when peers reorder).
    const disc = capturedBody.discoverability as Record<string, unknown>;
    assert.equal(disc.social_hook, 'Check this out');
    assert.equal(disc.canonical_path, undefined);

    // defaults to draft
    assert.equal(capturedBody._status, undefined);
    assert.equal(capturedBody.publish_status, 'draft');

    // response text
    const item0 = result.content[0];
    assert.ok(item0.type === 'text' && item0.text.startsWith('Created post:'));
    assert.ok(item0.type === 'text' && item0.text.includes('id: 123'));
    assert.ok(item0.type === 'text' && item0.text.includes('/admin/collections/posts/123'));
  } finally {
    restore();
  }
});

test('create_post passes publish_status through without legacy _status', async () => {
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
    assert.equal(capturedBody._status, undefined);
    assert.equal(capturedBody.publish_status, 'published');
  } finally {
    restore();
  }
});

test('create_post rejects invalid publish_status before any network call', async () => {
  let callCount = 0;

  const restore = mockFetch(async () => {
    callCount++;
    return jsonResponse({});
  });

  try {
    const result = await toolHandlers.create_post({
      title: 'Bad Status',
      excerpt: 'Nope.',
      content: 'Content.',
      publish_status: 'publshed',
    });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.match(result.content[0].text as string, /publish_status/);
    assert.equal(callCount, 0);
  } finally {
    restore();
  }
});

test('create_post requires scheduledPublishDate for explicit scheduled status', async () => {
  let callCount = 0;

  const restore = mockFetch(async () => {
    callCount++;
    return jsonResponse({});
  });

  try {
    const result = await toolHandlers.create_post({
      title: 'Missing Schedule',
      excerpt: 'Nope.',
      content: 'Content.',
      publish_status: 'scheduled',
    });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.match(result.content[0].text as string, /scheduledPublishDate/);
    assert.equal(callCount, 0);
  } finally {
    restore();
  }
});

test('create_post rejects malformed publishedDate before any network call', async () => {
  let callCount = 0;

  const restore = mockFetch(async () => {
    callCount++;
    return jsonResponse({});
  });

  try {
    const result = await toolHandlers.create_post({
      title: 'Bad Date',
      excerpt: 'Nope.',
      content: 'Content.',
      publishedDate: '2026-02-29',
    });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.match(result.content[0].text as string, /publishedDate/);
    assert.equal(callCount, 0);
  } finally {
    restore();
  }
});

test('create_post rejects scheduledPublishDate without timezone', async () => {
  let callCount = 0;

  const restore = mockFetch(async () => {
    callCount++;
    return jsonResponse({});
  });

  try {
    const result = await toolHandlers.create_post({
      title: 'Bad Schedule',
      excerpt: 'Nope.',
      content: 'Content.',
      scheduledPublishDate: '2026-05-14T14:00:00',
    });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.match(result.content[0].text as string, /scheduledPublishDate/);
    assert.equal(callCount, 0);
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

test('update_post passes publish_status through without legacy _status', async () => {
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
    assert.equal(patchBody._status, undefined);
    assert.equal(patchBody.publish_status, 'published');
  } finally {
    restore();
  }
});

test('update_post rejects invalid publish_status before lookup', async () => {
  let callCount = 0;

  const restore = mockFetch(async () => {
    callCount++;
    return jsonResponse({ docs: [{ id: 42 }] });
  });

  try {
    const result = await toolHandlers.update_post({
      slug: 'draft-post',
      publish_status: 'queued',
    });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.match(result.content[0].text as string, /publish_status/);
    assert.equal(callCount, 0);
  } finally {
    restore();
  }
});

test('update_post rejects invalid date fields before lookup', async () => {
  let callCount = 0;

  const restore = mockFetch(async () => {
    callCount++;
    return jsonResponse({ docs: [{ id: 42 }] });
  });

  try {
    const result = await toolHandlers.update_post({
      slug: 'draft-post',
      scheduledPublishDate: '2026-13-01T14:00:00Z',
    });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    assert.match(result.content[0].text as string, /scheduledPublishDate/);
    assert.equal(callCount, 0);
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

// ---------------------------------------------------------------------------
// TOOL_SCOPES — read vs write authorization
// ---------------------------------------------------------------------------

test('TOOL_SCOPES has an entry for every defined tool', () => {
  for (const tool of toolDefinitions) {
    assert.ok(
      TOOL_SCOPES[tool.name] === 'read' || TOOL_SCOPES[tool.name] === 'write',
      `Tool '${tool.name}' is missing a TOOL_SCOPES entry. Add it.`,
    );
  }
});

test('TOOL_SCOPES does not list any tool that no longer exists', () => {
  const definedNames = new Set(toolDefinitions.map((t) => t.name));
  for (const name of Object.keys(TOOL_SCOPES)) {
    assert.ok(definedNames.has(name), `TOOL_SCOPES references unknown tool '${name}'`);
  }
});

// Default-to-write invariant: list_*/get_* are read; everything else MUST
// be write. Catches drift — if someone adds e.g. delete_post or
// summarize_post and tags it 'read' by accident, this test fails. If a
// genuinely read-only tool with a different prefix is ever needed (e.g.
// search_*), extend the read-prefix allowlist below explicitly so the
// classification stays auditable.
const READ_PREFIXES = ['list_', 'get_'];

test('all tools are correctly scoped (read prefix vs default-to-write)', () => {
  for (const tool of toolDefinitions) {
    const scope = TOOL_SCOPES[tool.name];
    const isReadPrefix = READ_PREFIXES.some((p) => tool.name.startsWith(p));
    assert.equal(
      scope,
      isReadPrefix ? 'read' : 'write',
      isReadPrefix
        ? `Expected ${tool.name} to be read-scoped`
        : `Expected mutating tool '${tool.name}' to be write-scoped (or rename it with a read prefix)`,
    );
  }
});
