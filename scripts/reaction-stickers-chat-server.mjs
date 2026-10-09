import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const widgetHtml = readFileSync(path.join(root, 'chat-app', 'dist', 'widget.html'), 'utf8');
const workflowSource = readFileSync(path.join(root, 'public', 'reaction-stickers', 'workflow.js'), 'utf8');
const workflowJson = workflowSource.match(/window\.stickerWorkflow\s*=\s*(\{[\s\S]*\});/);
if (!workflowJson) throw new Error('Could not load the generated sticker workflow.');
const workflow = JSON.parse(workflowJson[1]);
const widgetUri = 'ui://reaction-stickers/prompt-grid-v1.html';

function createStickerServer() {
  const server = new McpServer({ name: 'reaction-stickers-chat', version: '0.1.0' });
  registerAppResource(server, 'reaction-stickers-prompt-grid', widgetUri, {}, async () => ({
    contents: [{
      uri: widgetUri,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml,
      _meta: {
        ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } },
        'openai/widgetDescription': 'Choose a character and ten reactions, then send the finished sticker prompt to chat.',
      },
    }],
  }));
  registerAppTool(server, 'open_sticker_prompt_grid', {
    title: 'Open sticker prompt grid',
    description: 'Open an interactive reaction-sticker prompt builder in this chat. Use when someone wants to choose a character reference, edit ten reactions, and prepare a JPG preview or a Telegram set. This tool does not generate or upload images.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: { ui: { resourceUri: widgetUri } },
  }, async () => ({
    content: [{ type: 'text', text: `Opened the ten-reaction prompt grid. Default order: ${workflow.labels.join(', ')}. Attach a character reference in chat before generating. The widget builds a prompt; it does not generate or upload images.` }],
    structuredContent: { workflow },
  }));
  return server;
}

const port = Number(process.env.PORT || 8788);
const host = process.env.HOST || '127.0.0.1';
const mcpMethods = new Set(['POST', 'GET', 'DELETE']);
createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('Reaction Stickers chat app');
    return;
  }
  if (req.method === 'GET' && url.pathname === '/preview') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(widgetHtml);
    return;
  }
  if (req.method === 'OPTIONS' && url.pathname === '/mcp') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, mcp-session-id, mcp-protocol-version, authorization',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    }).end();
    return;
  }
  if (url.pathname !== '/mcp' || !mcpMethods.has(req.method)) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  const server = createStickerServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Reaction Stickers MCP request failed:', error);
    if (!res.headersSent) res.writeHead(500).end('Internal server error');
  }
}).listen(port, host, () => console.log(`Reaction Stickers chat app: http://${host}:${port}/mcp`));
