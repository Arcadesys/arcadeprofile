import { postStatusValues } from './post-status';
import type { PayloadGroup, PayloadPost } from './payload-markdown-export';

type Fetch = typeof fetch;

type McpTextResult = {
  result?: {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
  error?: { message?: string };
};

function parseMcpResponse(raw: string): McpTextResult {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as McpTextResult;

  const data = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice('data: '.length))
    .join('\n');
  if (!data) throw new Error('Authenticated MCP export returned no JSON-RPC data.');
  return JSON.parse(data) as McpTextResult;
}

export async function callPayloadMcpTool<T>(options: {
  url: string;
  token: string;
  name: string;
  arguments?: Record<string, unknown>;
  fetchImpl?: Fetch;
}): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: options.name, arguments: options.arguments ?? {} },
      id: 1,
    }),
  });
  const payload = parseMcpResponse(await response.text());
  if (!response.ok) throw new Error(`Authenticated MCP export failed with HTTP ${response.status}.`);
  if (payload.error?.message) throw new Error(`Authenticated MCP export failed: ${payload.error.message}`);
  if (payload.result?.isError) throw new Error(`Authenticated MCP tool ${options.name} returned an error.`);
  const text = payload.result?.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error(`Authenticated MCP tool ${options.name} returned no text result.`);
  return JSON.parse(text) as T;
}

async function mapInBatches<T, U>(items: readonly T[], size: number, mapper: (item: T) => Promise<U>): Promise<U[]> {
  const results: U[] = [];
  for (let index = 0; index < items.length; index += size) {
    results.push(...await Promise.all(items.slice(index, index + size).map(mapper)));
  }
  return results;
}

/**
 * Read every Payload workflow status through the hosted read-only MCP channel.
 * Full documents are fetched separately so drafts and scheduled posts are
 * inventoried without widening the public REST collection.
 */
export async function collectPayloadMcpExport(options: {
  url: string;
  token: string;
  fetchImpl?: Fetch;
}): Promise<{ groups: PayloadGroup[]; posts: PayloadPost[] }> {
  const invoke = <T>(name: string, args: Record<string, unknown> = {}) => callPayloadMcpTool<T>({
    url: options.url,
    token: options.token,
    name,
    arguments: args,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const [groups, inventories] = await Promise.all([
    invoke<PayloadGroup[]>('list_projects'),
    Promise.all(postStatusValues.map((status) => invoke<Array<{ slug?: unknown }>>('list_posts', { status, limit: 1000 }))),
  ]);
  const slugs = inventories.flat().map((post) => post.slug).filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);
  if (slugs.length !== inventories.flat().length) throw new Error('Authenticated MCP inventory returned a post without a slug.');
  if (new Set(slugs).size !== slugs.length) throw new Error('Authenticated MCP inventory returned duplicate post slugs.');
  const posts = await mapInBatches(slugs, 8, (slug) => invoke<PayloadPost>('get_post', { slug }));
  return { groups, posts };
}
