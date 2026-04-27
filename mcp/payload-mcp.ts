#!/usr/bin/env node
/**
 * Stdio entry point for the Arcade Profile Payload MCP server.
 *
 * Tool definitions and handlers live in ./tools.ts and are shared with the
 * HTTP transport at app/(frontend)/api/mcp/route.ts.
 *
 * Usage:
 *   pnpm run mcp
 *   # or directly:
 *   PAYLOAD_API_URL=http://localhost:3000 PAYLOAD_API_KEY=<key> tsx mcp/payload-mcp.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, toolHandlers } from './tools.js';

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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Arcade Profile MCP server running on stdio');
