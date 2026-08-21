import assert from 'node:assert/strict';
import test from 'node:test';

import { callPayloadMcpTool, collectPayloadMcpExport } from './payload-mcp-export';

function sse(value: unknown): Response {
  return new Response(`event: message\ndata: ${JSON.stringify({ result: { content: [{ type: 'text', text: JSON.stringify(value) }] }, jsonrpc: '2.0', id: 1 })}\n\n`);
}

test('parses authenticated MCP SSE without exposing the bearer token in output', async () => {
  let authorization = '';
  const value = await callPayloadMcpTool<{ ok: boolean }>({
    url: 'https://example.test/api/mcp',
    token: 'read-secret',
    name: 'list_projects',
    fetchImpl: async (_input, init) => {
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return sse({ ok: true });
    },
  });
  assert.deepEqual(value, { ok: true });
  assert.equal(authorization, 'Bearer read-secret');
});

test('collects every workflow status then fetches complete documents in bounded batches', async () => {
  const requestedStatuses: string[] = [];
  const fetchedSlugs: string[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as { params: { name: string; arguments: Record<string, unknown> } };
    if (request.params.name === 'list_projects') return sse([{ id: 1, slug: 'alpha', title: 'Alpha' }]);
    if (request.params.name === 'list_posts') {
      const status = String(request.params.arguments.status);
      requestedStatuses.push(status);
      return sse([{ slug: `${status}-post` }]);
    }
    const slug = String(request.params.arguments.slug);
    fetchedSlugs.push(slug);
    return sse({ id: slug, slug, publish_status: slug.replace('-post', ''), group: 'alpha' });
  };
  const result = await collectPayloadMcpExport({ url: 'https://example.test/api/mcp', token: 'read-secret', fetchImpl });
  assert.deepEqual(requestedStatuses.sort(), ['draft', 'published', 'scheduled', 'sent']);
  assert.equal(result.groups.length, 1);
  assert.equal(result.posts.length, 4);
  assert.deepEqual(fetchedSlugs.sort(), ['draft-post', 'published-post', 'scheduled-post', 'sent-post']);
});
