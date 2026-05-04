/**
 * HTTP MCP transport for Arcade Profile Payload CMS.
 *
 * Exposes the same tools as the stdio server (mcp/payload-mcp.ts) over
 * HTTP/SSE so claude.ai custom connectors can reach it.
 *
 * Auth: Bearer token via MCP_API_KEY env var.
 *
 * Connecting from claude.ai:
 *   1. Deploy is live at https://arcadeprofile.vercel.app/api/mcp
 *   2. Settings → Connectors → Add custom connector
 *   3. URL: https://arcadeprofile.vercel.app/api/mcp
 *   4. Auth header name:  Authorization
 *   5. Auth header value: Bearer <MCP_API_KEY>
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, toolHandlers } from '@/mcp/tools';
import type { NextRequest } from 'next/server';

// Must be nodejs runtime — MCP SDK uses Node.js APIs.
export const runtime = 'nodejs';
// Never cache this route.
export const dynamic = 'force-dynamic';

function unauthorized(origin: string): Response {
  const resourceMetadata = `${origin}/.well-known/oauth-protected-resource/api/mcp`;
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Bearer realm="${origin}", resource_metadata="${resourceMetadata}"`,
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  // ---------- Auth ----------
  const mcpApiKey = process.env.MCP_API_KEY;
  const origin = req.nextUrl.origin;
  if (!mcpApiKey) {
    return unauthorized(origin);
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${mcpApiKey}`) {
    return unauthorized(origin);
  }

  // ---------- Build a fresh server + transport per request (stateless) ----------
  const server = new Server(
    { name: 'arcadeprofile-payload', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const handler = toolHandlers[name];
    if (!handler) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
    try {
      return await handler(args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  // WebStandardStreamableHTTPServerTransport uses native Request/Response —
  // no adapter needed for Next.js App Router.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no session management
  });

  await server.connect(transport);

  return transport.handleRequest(req);
}
