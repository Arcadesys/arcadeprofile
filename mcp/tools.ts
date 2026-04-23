/**
 * Shared MCP tool definitions and handlers for Arcade Profile Payload CMS.
 *
 * Imported by both the stdio entry point (payload-mcp.ts) and the HTTP route
 * (app/(frontend)/api/mcp/route.ts) so there is a single source of truth.
 */

import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Env / config (resolved at import time for stdio; injected at request time
// for HTTP by setting process.env before the route module initialises)
// ---------------------------------------------------------------------------

export function getBaseUrl(): string {
  return process.env.PAYLOAD_API_URL || 'http://localhost:3000';
}

export function getApiKey(): string {
  return process.env.PAYLOAD_API_KEY || '';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) h['Authorization'] = `Bearer ${key}`;
  return h;
}

export async function payloadFetch(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${getBaseUrl()}/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...apiHeaders(), ...(options?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Payload API error (${res.status}): ${text}`);
  }
  return res.json();
}

export function markdownToLexical(markdown: string): unknown {
  // Minimal Lexical paragraph node representation for plain markdown.
  // Agents can pass pre-formatted Lexical JSON, or we wrap the raw text.
  const paragraphs = markdown
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((text) => ({
      type: 'paragraph',
      version: 1,
      children: [
        {
          type: 'text',
          version: 1,
          text: text.replace(/\n/g, ' '),
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
    }));

  return {
    root: {
      type: 'root',
      version: 1,
      children: paragraphs,
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const toolDefinitions: Tool[] = [
  // ---- Posts ----
  {
    name: 'list_posts',
    description: 'List all blog posts with title, slug, group, status, and date.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 50)' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Filter by _status',
        },
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
    description:
      'Create a new blog post. Supply meta.* and discoverability.* for every publish-ready post.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: {
          type: 'string',
          description: 'URL slug (auto-generated from title if omitted)',
        },
        excerpt: { type: 'string', description: 'Teaser for humans browsing the blog index' },
        content: { type: 'string', description: 'Post body in markdown' },
        publishedDate: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD). Defaults to today.',
        },
        group: { type: 'string', description: 'Group/series slug' },
        order: { type: 'number', description: 'Sort order within group' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Flat list of tag strings',
        },
        author: { type: 'string', description: 'Defaults to Austen Tucker' },
        publish_status: {
          type: 'string',
          enum: ['draft', 'scheduled', 'published', 'sent'],
          description: 'Newsletter workflow status. Defaults to draft.',
        },
        scheduledPublishDate: {
          type: 'string',
          description: 'ISO datetime for scheduled posts',
        },
        newsletterHeading: { type: 'string' },
        newsletterDescription: { type: 'string' },
        skipNewsletter: {
          type: 'boolean',
          description:
            'If true, sets newsletterSent=true on create so the afterChange hook skips the Postmark send. Use when posting archival content or republishing.',
        },
        meta: {
          type: 'object',
          description: 'SEO metadata. Populate title, description, and keywords for every post.',
          properties: {
            title: {
              type: 'string',
              description: '<title> override. Target ≤60 chars.',
            },
            description: {
              type: 'string',
              description: 'Meta description for SERPs. Target 150–160 chars.',
            },
            keywords: { type: 'string', description: 'Comma-separated keywords' },
          },
        },
        discoverability: {
          type: 'object',
          description: 'How the post gets surfaced and distributed.',
          properties: {
            social_hook: {
              type: 'string',
              description: 'Bluesky/Mastodon teaser. ≤280 chars.',
            },
            search_summary: {
              type: 'string',
              description:
                '2–3 sentences for AI/search indexing. Front-load main claims.',
            },
            canonical_path: {
              type: 'string',
              description: 'Canonical URL path. Defaults to /blog/{slug}.',
            },
            featured_on_start_here: { type: 'boolean' },
            primaryCTA: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                href: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      required: ['title', 'excerpt', 'content'],
    },
  },
  {
    name: 'update_post',
    description:
      'Update an existing post by slug. All fields except slug are optional.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug of the post to update (required for lookup)' },
        title: { type: 'string' },
        excerpt: { type: 'string' },
        content: { type: 'string', description: 'New body in markdown (replaces existing)' },
        publishedDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        group: { type: 'string' },
        order: { type: 'number' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Flat list of tag strings (replaces existing tags)',
        },
        author: { type: 'string' },
        publish_status: {
          type: 'string',
          enum: ['draft', 'scheduled', 'published', 'sent'],
        },
        scheduledPublishDate: { type: 'string' },
        newsletterHeading: { type: 'string' },
        newsletterDescription: { type: 'string' },
        skipNewsletter: {
          type: 'boolean',
          description: 'Set newsletterSent=true to suppress the afterChange send hook.',
        },
        meta: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            keywords: { type: 'string' },
          },
        },
        discoverability: {
          type: 'object',
          properties: {
            social_hook: { type: 'string' },
            search_summary: { type: 'string' },
            canonical_path: { type: 'string' },
            featured_on_start_here: { type: 'boolean' },
            primaryCTA: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                href: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      required: ['slug'],
    },
  },
  // ---- Pages ----
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
  // ---- Groups ----
  {
    name: 'list_groups',
    description: 'List all essay series/groups.',
    inputSchema: { type: 'object', properties: {} },
  },
  // ---- Books ----
  {
    name: 'list_books',
    description: 'List all books in the Payload Books collection.',
    inputSchema: { type: 'object', properties: {} },
  },
  // ---- Projects ----
  {
    name: 'list_projects',
    description: 'List all projects in the Payload Projects collection.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Handler type
// ---------------------------------------------------------------------------

export type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

export const toolHandlers: Record<string, ToolHandler> = {
  // ---- Posts ----

  async list_posts(args) {
    const limit = (args.limit as number) || 50;
    const where = args.status ? `&where[_status][equals]=${args.status}` : '';
    const data = (await payloadFetch(
      `/posts?limit=${limit}&sort=-publishedDate&depth=0${where}`,
    )) as { docs: Record<string, unknown>[] };
    const posts = data.docs.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      group: p.group,
      status: p._status,
      publish_status: p.publish_status,
      publishedDate: p.publishedDate,
      excerpt: p.excerpt,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(posts, null, 2) }] };
  },

  async get_post(args) {
    const data = (await payloadFetch(
      `/posts?where[slug][equals]=${args.slug}&limit=1&depth=0`,
    )) as { docs: unknown[] };
    if (!data.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs[0], null, 2) }] };
  },

  async create_post(args) {
    const slug =
      (args.slug as string) ||
      (args.title as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const publish_status = (args.publish_status as string) || 'draft';
    const _status = publish_status === 'published' ? 'published' : 'draft';

    // Discoverability: default canonical_path to /blog/{slug} if not provided
    const discoverabilityIn = (args.discoverability as Record<string, unknown>) || {};
    const discoverability = {
      ...discoverabilityIn,
      canonical_path: discoverabilityIn.canonical_path ?? `/blog/${slug}`,
    };

    const body: Record<string, unknown> = {
      title: args.title,
      slug,
      excerpt: args.excerpt,
      content: markdownToLexical(args.content as string),
      publishedDate: (args.publishedDate as string) || new Date().toISOString().slice(0, 10),
      _status,
      publish_status,
    };

    if (args.group !== undefined) body.group = args.group;
    if (args.order !== undefined) body.order = args.order;
    if (args.author !== undefined) body.author = args.author;
    if (args.scheduledPublishDate !== undefined)
      body.scheduledPublishDate = args.scheduledPublishDate;
    if (args.newsletterHeading !== undefined) body.newsletterHeading = args.newsletterHeading;
    if (args.newsletterDescription !== undefined)
      body.newsletterDescription = args.newsletterDescription;

    // tags: string[] → Payload's array-of-objects shape
    if (Array.isArray(args.tags)) {
      body.tags = (args.tags as string[]).map((t) => ({ tag: t }));
    }

    // skipNewsletter suppresses the afterChange send hook
    if (args.skipNewsletter === true) body.newsletterSent = true;

    if (args.meta) body.meta = args.meta;
    body.discoverability = discoverability;

    const data = (await payloadFetch('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { doc?: { slug?: string } };

    return {
      content: [
        { type: 'text', text: `Created post: ${data.doc?.slug ?? slug}` },
      ],
    };
  },

  async update_post(args) {
    const found = (await payloadFetch(
      `/posts?where[slug][equals]=${args.slug}&limit=1&depth=0`,
    )) as { docs: { id: number }[] };
    if (!found.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };

    const id = found.docs[0].id;
    const payload: Record<string, unknown> = {};

    if (args.title !== undefined) payload.title = args.title;
    if (args.excerpt !== undefined) payload.excerpt = args.excerpt;
    if (args.content !== undefined)
      payload.content = markdownToLexical(args.content as string);
    if (args.publishedDate !== undefined) payload.publishedDate = args.publishedDate;
    if (args.group !== undefined) payload.group = args.group;
    if (args.order !== undefined) payload.order = args.order;
    if (args.author !== undefined) payload.author = args.author;
    if (args.scheduledPublishDate !== undefined)
      payload.scheduledPublishDate = args.scheduledPublishDate;
    if (args.newsletterHeading !== undefined) payload.newsletterHeading = args.newsletterHeading;
    if (args.newsletterDescription !== undefined)
      payload.newsletterDescription = args.newsletterDescription;

    if (args.publish_status !== undefined) {
      payload.publish_status = args.publish_status;
      // Keep _status in sync
      payload._status = args.publish_status === 'published' ? 'published' : 'draft';
    }

    if (Array.isArray(args.tags)) {
      payload.tags = (args.tags as string[]).map((t) => ({ tag: t }));
    }

    if (args.skipNewsletter === true) payload.newsletterSent = true;
    if (args.meta !== undefined) payload.meta = args.meta;
    if (args.discoverability !== undefined) payload.discoverability = args.discoverability;

    await payloadFetch(`/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return { content: [{ type: 'text', text: `Updated post: ${args.slug}` }] };
  },

  // ---- Pages ----

  async list_pages() {
    const data = (await payloadFetch('/pages?limit=50&depth=0')) as {
      docs: Record<string, unknown>[];
    };
    const pages = data.docs.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p._status,
      excerpt: p.excerpt,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(pages, null, 2) }] };
  },

  async get_page(args) {
    const data = (await payloadFetch(
      `/pages?where[slug][equals]=${args.slug}&limit=1&depth=0`,
    )) as { docs: unknown[] };
    if (!data.docs.length) return { content: [{ type: 'text', text: 'Page not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs[0], null, 2) }] };
  },

  async update_page(args) {
    const found = (await payloadFetch(
      `/pages?where[slug][equals]=${args.slug}&limit=1&depth=0`,
    )) as { docs: { id: number }[] };
    if (!found.docs.length) return { content: [{ type: 'text', text: 'Page not found.' }] };

    const id = found.docs[0].id;
    const payload: Record<string, unknown> = {};
    if (args.title) payload.title = args.title;
    if (args.excerpt) payload.excerpt = args.excerpt;
    if (args.content) payload.content = markdownToLexical(args.content as string);

    await payloadFetch(`/pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return { content: [{ type: 'text', text: `Updated page: ${args.slug}` }] };
  },

  // ---- Groups ----

  async list_groups() {
    const data = (await payloadFetch('/groups?limit=50&depth=0')) as {
      docs: Record<string, unknown>[];
    };
    const groups = data.docs.map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      description: g.description,
      tags: g.tags,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }] };
  },

  // ---- Books ----

  async list_books() {
    const data = (await payloadFetch('/books?limit=50&depth=0')) as { docs: unknown[] };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs, null, 2) }] };
  },

  // ---- Projects ----

  async list_projects() {
    const data = (await payloadFetch('/projects?limit=50&depth=0')) as { docs: unknown[] };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs, null, 2) }] };
  },
};
