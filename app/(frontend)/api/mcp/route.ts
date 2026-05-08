/**
 * HTTP MCP transport for Arcade Profile Payload CMS.
 *
 * Exposes the same tools as the stdio server (mcp/payload-mcp.ts) over
 * HTTP/SSE so claude.ai custom connectors can reach it.
 *
 * Auth (in priority order):
 *   - MCP_API_KEYS  — comma-separated list of write keys (full read+write).
 *                     Supports rotation: set the new key, deploy, swap
 *                     connectors, then remove the old key.
 *   - MCP_API_KEY   — single write key (back-compat shorthand for
 *                     MCP_API_KEYS with one entry).
 *   - MCP_READ_KEYS — comma-separated list of read-only keys
 *                     (list_*, get_* tools only).
 *   - MCP_READ_KEY  — single read-only key.
 *
 * Connecting from claude.ai:
 *   1. Deploy is live at https://arcadeprofile.vercel.app/api/mcp
 *   2. Settings → Connectors → Add custom connector
 *   3. URL: https://arcadeprofile.vercel.app/api/mcp
 *   4. Auth header name:  Authorization
 *   5. Auth header value: Bearer <one of the configured keys>
 */

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_SCOPES, toolDefinitions, toolHandlers, type ToolScope } from '@/mcp/tools';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';

// Must be nodejs runtime — MCP SDK uses Node.js APIs.
export const runtime = 'nodejs';
// Never cache this route.
export const dynamic = 'force-dynamic';

function unauthorized(): Response {
  return new Response('Unauthorized', { status: 401 });
}

type Caller = { scope: ToolScope };

function parseKeyList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

/**
 * Pre-hash configured keys at module load. Vercel bakes env vars at deploy
 * time and the route module is fresh per deploy, so this picks them up
 * correctly. Pre-hashing means each request hashes the presented token
 * once — not once per configured key.
 */
const WRITE_KEY_HASHES: Buffer[] = [
  ...parseKeyList(process.env.MCP_API_KEYS),
  ...(process.env.MCP_API_KEY ? [process.env.MCP_API_KEY] : []),
].map(sha256);

const READ_KEY_HASHES: Buffer[] = [
  ...parseKeyList(process.env.MCP_READ_KEYS),
  ...(process.env.MCP_READ_KEY ? [process.env.MCP_READ_KEY] : []),
].map(sha256);

/**
 * Constant-time bearer match. We compare SHA-256 hashes of equal length
 * (32 bytes) so timingSafeEqual never throws on length mismatch — the
 * throw itself would leak length info. SHA-256 is fine for this; it's
 * not a password derivation context.
 */
function findScope(token: string): ToolScope | null {
  const presented = sha256(token);
  for (const hash of WRITE_KEY_HASHES) {
    if (timingSafeEqual(presented, hash)) return 'write';
  }
  for (const hash of READ_KEY_HASHES) {
    if (timingSafeEqual(presented, hash)) return 'read';
  }
  return null;
}

function authenticate(req: NextRequest): Caller | null {
  if (WRITE_KEY_HASHES.length === 0 && READ_KEY_HASHES.length === 0) return null;

  const header = req.headers.get('authorization')?.trim() ?? '';
  const [scheme, token] = header.split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  const scope = findScope(token);
  return scope ? { scope } : null;
}

function callerCan(caller: Caller, tool: string): boolean {
  const required = TOOL_SCOPES[tool];
  if (!required) return false;
  if (required === 'read') return true; // both scopes can read
  return caller.scope === 'write';
}

function requestContext(req: NextRequest): { requestId: string; ip: string; userAgent: string } {
  const requestId = req.headers.get('x-vercel-id') ?? randomUUID();
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  return { requestId, ip, userAgent };
}

export async function POST(req: NextRequest): Promise<Response> {
  const caller = authenticate(req);
  if (!caller) {
    const ctx = requestContext(req);
    logger.warn(
      { ...ctx, route: '/api/mcp' },
      '[mcp] auth failed',
    );
    return unauthorized();
  }

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
