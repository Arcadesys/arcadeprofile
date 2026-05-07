/**
 * HTTP MCP transport for Arcade Profile Payload CMS.
 *
 * Exposes the same tools as the stdio server (mcp/payload-mcp.ts) over
 * HTTP/SSE so claude.ai custom connectors can reach it.
 *
 * Auth: Bearer token via MCP_API_KEY env var (full read+write access),
 * or the optional MCP_READ_KEY env var (read-only — list_*, get_*).
 *
 * Connecting from claude.ai:
 *   1. Deploy is live at https://arcadeprofile.vercel.app/api/mcp
 *   2. Settings → Connectors → Add custom connector
 *   3. URL: https://arcadeprofile.vercel.app/api/mcp
 *   4. Auth header name:  Authorization
 *   5. Auth header value: Bearer <MCP_API_KEY> or Bearer <MCP_READ_KEY>
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_SCOPES, toolDefinitions, toolHandlers, type ToolScope } from '@/mcp/tools';
import type { NextRequest } from 'next/server';

// Must be nodejs runtime — MCP SDK uses Node.js APIs.
export const runtime = 'nodejs';
// Never cache this route.
export const dynamic = 'force-dynamic';

function unauthorized(): Response {
  return new Response('Unauthorized', { status: 401 });
}

type Caller = { scope: ToolScope };

function authenticate(req: NextRequest): Caller | null {
  const writeKey = process.env.MCP_API_KEY;
  const readKey = process.env.MCP_READ_KEY;
  if (!writeKey && !readKey) return null;

  const header = req.headers.get('authorization')?.trim() ?? '';
  const [scheme, token] = header.split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  if (writeKey && token === writeKey) return { scope: 'write' };
  if (readKey && token === readKey) return { scope: 'read' };
  return null;
}

function callerCan(caller: Caller, tool: string): boolean {
  const required = TOOL_SCOPES[tool];
  if (!required) return false;
  if (required === 'read') return true; // both scopes can read
  return caller.scope === 'write';
}

export async function POST(req: NextRequest): Promise<Response> {
  const caller = authenticate(req);
  if (!caller) return unauthorized();

  // ---------- Build a fresh server + transport per request (stateless) ----------
  const server = new Server(
    { name: 'arcadeprofile-payload', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions.filter((t) => callerCan(caller, t.name)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const handler = toolHandlers[name];
    if (!handler) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
    if (!callerCan(caller, name)) {
      return {
        content: [
          { type: 'text', text: `Forbidden: tool '${name}' requires write scope.` },
        ],
        isError: true,
      };
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
