#!/usr/bin/env node
/**
 * Payload CMS MCP Server for the Arcades site.
 *
 * Exposes Payload collections as MCP tools so AI agents can read
 * and write content programmatically.
 *
 * Usage:
 *   npm run mcp
 *   # or directly:
 *   PAYLOAD_API_URL=http://localhost:3000 PAYLOAD_API_KEY=<key> tsx mcp/payload-mcp.ts
 *
 * MCP config (~/.claude/mcp.json or .mcp.json in the repo):
 *   {
 *     "mcpServers": {
 *       "arcadeprofile": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/mcp/payload-mcp.ts"],
 *         "env": {
 *           "PAYLOAD_API_URL": "http://localhost:3000",
 *           "PAYLOAD_API_KEY": "<your-payload-api-key>"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.PAYLOAD_API_URL || 'http://localhost:3000';
const API_KEY = process.env.PAYLOAD_API_KEY || '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['Authorization'] = `Bearer ${API_KEY}`;
  return h;
}

async function payloadFetch(path: string, options?: RequestInit) {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, { ...options, headers: { ...apiHeaders(), ...options?.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Payload API error (${res.status}): ${text}`);
  }
  return res.json();
}

async function markdownToLexical(markdown: string) {
  const res = await fetch(`${BASE_URL}/api/markdown-to-lexical`, {
    method: 'POST',
    headers: { ...apiHeaders() },
    body: JSON.stringify({ markdown }),
  });
  if (!res.ok) {
    throw new Error(`markdown-to-lexical conversion failed (${res.status}): ${await res.text()}`);
  }
  const { lexical } = await res.json();
  return lexical;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'arcadeprofile-payload', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Posts
    {
      name: 'list_posts',
      description: 'List all blog posts with title, slug, group, status, and date.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max results (default 50)' },
          status: { type: 'string', enum: ['draft', 'published'], description: 'Filter by status' },
        },
      },
    },
    {
      name: 'get_post',
      description: 'Get a full blog post by slug, including its Lexical content JSON.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string' } },
        required: ['slug'],
      },
    },
    {
      name: 'create_post',
      description: 'Create a new draft blog post. Content can be plain markdown text.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          slug: { type: 'string', description: 'URL slug (auto-generated from title if omitted)' },
          excerpt: { type: 'string' },
          content: { type: 'string', description: 'Post body in markdown' },
          group: { type: 'string', description: 'Group/series slug' },
          publishedDate: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
        },
        required: ['title', 'excerpt', 'content'],
      },
    },
    {
      name: 'update_post',
      description: 'Update an existing post by slug.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          excerpt: { type: 'string' },
          content: { type: 'string', description: 'New body in markdown (replaces existing)' },
          status: { type: 'string', enum: ['draft', 'published'] },
          group: { type: 'string' },
        },
        required: ['slug'],
      },
    },
    // Pages
    {
      name: 'list_pages',
      description: 'List all Payload Pages (About, etc.).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_page',
      description: 'Get a page by slug with all section fields.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string' } },
        required: ['slug'],
      },
    },
    {
      name: 'update_page',
      description: 'Update a page by slug. Provide only the fields to change.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          excerpt: { type: 'string' },
          content: { type: 'string', description: 'New main content in markdown' },
        },
        required: ['slug'],
      },
    },
    // Groups
    {
      name: 'list_groups',
      description: 'List all essay series/groups.',
      inputSchema: { type: 'object', properties: {} },
    },
    // Books
    {
      name: 'list_books',
      description: 'List all books in the Payload Books collection.',
      inputSchema: { type: 'object', properties: {} },
    },
    // Projects
    {
      name: 'list_projects',
      description: 'List all projects in the Payload Projects collection.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      // ---- Posts ----
      case 'list_posts': {
        const limit = (args.limit as number) || 50;
        const where = args.status
          ? `&where[_status][equals]=${args.status}`
          : '';
        const data = await payloadFetch(`/posts?limit=${limit}&sort=-publishedDate&depth=0${where}`);
        const posts = data.docs.map((p: Record<string, unknown>) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          group: p.group,
          status: p._status,
          publishedDate: p.publishedDate,
          excerpt: p.excerpt,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(posts, null, 2) }] };
      }

      case 'get_post': {
        const data = await payloadFetch(
          `/posts?where[slug][equals]=${args.slug}&limit=1&depth=0`,
        );
        if (!data.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };
        return { content: [{ type: 'text', text: JSON.stringify(data.docs[0], null, 2) }] };
      }

      case 'create_post': {
        const slug = (args.slug as string) ||
          (args.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const content = await markdownToLexical(args.content as string);
        const data = await payloadFetch('/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: args.title,
            slug,
            excerpt: args.excerpt,
            content,
            group: args.group || '',
            publishedDate: args.publishedDate || new Date().toISOString().slice(0, 10),
            _status: 'draft',
          }),
        });
        return { content: [{ type: 'text', text: `Created post: ${data.doc?.slug || slug}` }] };
      }

      case 'update_post': {
        const found = await payloadFetch(
          `/posts?where[slug][equals]=${args.slug}&limit=1&depth=0`,
        );
        if (!found.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };

        const id = found.docs[0].id;
        const payload: Record<string, unknown> = {};
        if (args.title) payload.title = args.title;
        if (args.excerpt) payload.excerpt = args.excerpt;
        if (args.content) payload.content = await markdownToLexical(args.content as string);
        if (args.status) payload._status = args.status;
        if (args.group !== undefined) payload.group = args.group;

        await payloadFetch(`/posts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return { content: [{ type: 'text', text: `Updated post: ${args.slug}` }] };
      }

      // ---- Pages ----
      case 'list_pages': {
        const data = await payloadFetch('/pages?limit=50&depth=0');
        const pages = data.docs.map((p: Record<string, unknown>) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p._status,
          excerpt: p.excerpt,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(pages, null, 2) }] };
      }

      case 'get_page': {
        const data = await payloadFetch(
          `/pages?where[slug][equals]=${args.slug}&limit=1&depth=0`,
        );
        if (!data.docs.length) return { content: [{ type: 'text', text: 'Page not found.' }] };
        return { content: [{ type: 'text', text: JSON.stringify(data.docs[0], null, 2) }] };
      }

      case 'update_page': {
        const found = await payloadFetch(
          `/pages?where[slug][equals]=${args.slug}&limit=1&depth=0`,
        );
        if (!found.docs.length) return { content: [{ type: 'text', text: 'Page not found.' }] };

        const id = found.docs[0].id;
        const payload: Record<string, unknown> = {};
        if (args.title) payload.title = args.title;
        if (args.excerpt) payload.excerpt = args.excerpt;
        if (args.content) payload.content = await markdownToLexical(args.content as string);

        await payloadFetch(`/pages/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return { content: [{ type: 'text', text: `Updated page: ${args.slug}` }] };
      }

      // ---- Groups ----
      case 'list_groups': {
        const data = await payloadFetch('/groups?limit=50&depth=0');
        const groups = data.docs.map((g: Record<string, unknown>) => ({
          id: g.id,
          title: g.title,
          slug: g.slug,
          description: g.description,
          tags: g.tags,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }] };
      }

      // ---- Books ----
      case 'list_books': {
        const data = await payloadFetch('/books?limit=50&depth=0');
        return { content: [{ type: 'text', text: JSON.stringify(data.docs, null, 2) }] };
      }

      // ---- Projects ----
      case 'list_projects': {
        const data = await payloadFetch('/projects?limit=50&depth=0');
        return { content: [{ type: 'text', text: JSON.stringify(data.docs, null, 2) }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Arcade Profile MCP server running on stdio');
