/**
 * Shared MCP tool definitions and handlers for Arcade Profile Payload CMS.
 *
 * Imported by both the stdio entry point (payload-mcp.ts) and the HTTP route
 * (app/(frontend)/api/mcp/route.ts) so there is a single source of truth.
 */

import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { isIsoDateOnly, parseIsoDateOnly } from '../lib/iso-date';
import { postStatusValues } from '../lib/post-status';
import { buildPreviewUrl } from '../lib/preview-token';
import { todayInSiteTz } from '../lib/site-time';

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
  if (key) h['Authorization'] = `users API-Key ${key}`;
  return h;
}

type QueryParamValue = string | number | boolean | null | undefined;

export function payloadQueryPath(
  collectionPath: string,
  params: Record<string, QueryParamValue>,
): string {
  const path = collectionPath.startsWith('/') ? collectionPath : `/${collectionPath}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
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

export async function markdownToLexical(markdown: string): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) headers['Authorization'] = `Bearer ${key}`;
  const res = await fetch(`${getBaseUrl()}/api/markdown-to-lexical`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ markdown }),
  });
  if (!res.ok) {
    throw new Error(
      `markdown-to-lexical conversion failed (${res.status}): ${await res.text()}`,
    );
  }
  const { lexical } = (await res.json()) as { lexical: unknown };
  return lexical;
}

function toolError(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

const ISO_DATETIME_WITH_ZONE_RE =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function isIsoDateTimeWithZone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATETIME_WITH_ZONE_RE.exec(value);
  if (!match || !parseIsoDateOnly(match[1])) return false;

  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = match[4] === undefined ? 0 : Number(match[4]);
  if (hour > 23 || minute > 59 || second > 59) return false;

  const zone = match[5];
  if (zone !== 'Z') {
    const [offsetHour, offsetMinute] = zone.slice(1).split(':').map(Number);
    if (Number.isNaN(offsetHour) || Number.isNaN(offsetMinute) || offsetHour > 23 || offsetMinute > 59) return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function validatePublishedDateInput(value: unknown): CallToolResult | null {
  if (isIsoDateOnly(value)) return null;
  return toolError('publishedDate must be a valid YYYY-MM-DD date.');
}

function validateScheduledPublishDateInput(value: unknown): CallToolResult | null {
  if (value === undefined || value === null || isIsoDateTimeWithZone(value)) return null;
  return toolError('scheduledPublishDate must be a valid ISO datetime with timezone.');
}

function validatePublishStatusInput(value: unknown): CallToolResult | null {
  if (value === undefined || postStatusValues.includes(value as (typeof postStatusValues)[number])) {
    return null;
  }
  return toolError(`publish_status must be one of: ${postStatusValues.join(', ')}.`);
}

function validatePositiveIntegerInput(fieldName: string, value: unknown): CallToolResult | null {
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    return toolError(`${fieldName} must be a positive safe integer.`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const toolDefinitions: Tool[] = [
  // ---- Posts ----
  {
    name: 'list_posts',
    description: 'List recent blog posts with title, slug, group, status, and date.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 50)' },
        status: {
          type: 'string',
          enum: [...postStatusValues],
          description: 'Filter by publish_status',
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
        content: {
          type: 'string',
          description:
            'Post body in markdown. To embed an image, first upload it with upload_image (or upload_and_embed_image) and reference the returned media id with the placeholder syntax `![media:<id>]()` on its own line. Standard `![alt](url)` markdown is NOT converted — uploads must reference a Media doc.',
        },
        publishedDate: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD). Defaults to today.',
        },
        group: { type: 'string', description: 'Group/series slug' },
        chapter: { type: 'string', description: 'Optional reader-section slug (for example, book-one or act-two)' },
        order: { type: 'number', description: 'Sort order within group' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Flat list of tag strings',
        },
        author: { type: 'string', description: 'Defaults to Austen Tucker' },
        publish_status: {
          type: 'string',
          enum: [...postStatusValues],
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
            'If true, sets suppressNewsletter=true so scheduled publishing records the newsletter as skipped and does not call Postmark. Use for archival content or republishing.',
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
              description:
                'Canonical URL path. Optional — leave unset to use the post page itself; the part number is derived from the post\'s sorted position in its group at render time, so storing it here can drift out of sync if peers are reordered.',
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
        content: {
          type: 'string',
          description:
            'New body in markdown (replaces existing). To embed an image, upload it via upload_image (or upload_and_embed_image) first and reference the returned media id with `![media:<id>]()` on its own line.',
        },
        publishedDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        group: { type: 'string' },
        chapter: { type: 'string', description: 'Optional reader-section slug' },
        order: { type: 'number' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Flat list of tag strings (replaces existing tags)',
        },
        author: { type: 'string' },
        publish_status: {
          type: 'string',
          enum: [...postStatusValues],
        },
        scheduledPublishDate: { type: 'string' },
        newsletterHeading: { type: 'string' },
        newsletterDescription: { type: 'string' },
        skipNewsletter: {
          type: 'boolean',
          description:
            'Set suppressNewsletter=true so scheduled publishing skips Postmark delivery.',
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
    description: 'List all projects (groups are the canonical project entity).',
    inputSchema: { type: 'object', properties: {} },
  },
  // ---- Media ----
  {
    name: 'upload_image',
    description:
      'Upload an image to the Payload Media collection (stored in Vercel Blob). Provide either `filePath` (when the MCP runs locally with access to the caller\'s filesystem) or `fileContent` (base64-encoded bytes) plus `filename` (when calling the hosted MCP, which has no view of the caller\'s disk). Returns the media id and public URL.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the local image file. Use only when the MCP server can read your filesystem (stdio transport).',
        },
        fileContent: {
          type: 'string',
          description: 'Base64-encoded image bytes. Use for the hosted MCP (no filesystem access). Plain base64 or a `data:image/...;base64,...` URI both work.',
        },
        filename: {
          type: 'string',
          description: 'Original filename including extension (e.g. "moral-panic-mob.jpg"). Required when using `fileContent`; ignored when using `filePath`.',
        },
        alt: { type: 'string', description: 'Alt text for accessibility.' },
        caption: { type: 'string', description: 'Optional caption.' },
      },
      oneOf: [
        { required: ['filePath'] },
        { required: ['fileContent', 'filename'] },
      ],
    },
  },
  {
    name: 'upload_and_embed_image',
    description:
      'One-shot: upload an image to Media, then embed it in an existing post by inserting an upload node at the top or bottom of the post body. Provide either `filePath` (local MCP) or `fileContent` + `filename` (hosted MCP). Use this when you already have a published/draft post and want to add an image without manually editing the markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug of the post to embed the image into.' },
        filePath: {
          type: 'string',
          description: 'Absolute path to the local image file. Use only when the MCP server can read your filesystem (stdio transport).',
        },
        fileContent: {
          type: 'string',
          description: 'Base64-encoded image bytes. Use for the hosted MCP (no filesystem access). Plain base64 or a `data:image/...;base64,...` URI both work.',
        },
        filename: {
          type: 'string',
          description: 'Original filename including extension. Required when using `fileContent`.',
        },
        alt: { type: 'string', description: 'Alt text for accessibility.' },
        caption: { type: 'string', description: 'Optional caption stored on the Media doc.' },
        position: {
          type: 'string',
          enum: ['append', 'prepend'],
          description:
            'Where to insert the image relative to the existing post body. Defaults to append.',
        },
      },
      required: ['slug'],
      oneOf: [
        { required: ['filePath'] },
        { required: ['fileContent', 'filename'] },
      ],
    },
  },
  {
    name: 'repair_post_image_markdown',
    description:
      'Scan post(s) for Lexical paragraphs that still contain raw markdown — `![alt](url)` images pointing at an existing Media doc by filename, `---` horizontal-rule lines, `[text](url)` links, and bare YouTube URLs — and rewrite them in place as proper upload / horizontalrule / link / YouTube block nodes. Use to fix posts imported before the markdown→Lexical converter knew about these features. Pass `slug` to repair one post; omit it to scan every post.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'Slug of a single post to repair. Omit to scan all posts.',
        },
        dryRun: {
          type: 'boolean',
          description:
            'If true, report what would change without writing. Defaults to false.',
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Handler type
// ---------------------------------------------------------------------------

export type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

// ---------------------------------------------------------------------------
// Authorization scopes
// ---------------------------------------------------------------------------

/**
 * Each tool is either 'read' or 'write'. The HTTP transport accepts a
 * read-only bearer key (MCP_READ_KEY) that may only invoke 'read' tools,
 * and the existing privileged key (MCP_API_KEY) that may invoke both.
 *
 * Audit: if you add a tool above, add it here too — TypeScript won't
 * catch a missing entry, but the test suite asserts every tool has a
 * scope.
 */
export type ToolScope = 'read' | 'write';

export const TOOL_SCOPES: Record<string, ToolScope> = {
  // Posts
  list_posts: 'read',
  get_post: 'read',
  create_post: 'write',
  update_post: 'write',
  // Pages
  list_pages: 'read',
  get_page: 'read',
  update_page: 'write',
  // Misc reads
  list_groups: 'read',
  list_books: 'read',
  list_projects: 'read',
  // Media
  upload_image: 'write',
  upload_and_embed_image: 'write',
  repair_post_image_markdown: 'write',
};

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

export const toolHandlers: Record<string, ToolHandler> = {
  // ---- Posts ----

  async list_posts(args) {
    const publishStatusError = validatePublishStatusInput(args.status);
    if (publishStatusError) return publishStatusError;

    const limitError = validatePositiveIntegerInput('limit', args.limit);
    if (limitError) return limitError;

    const limit = (args.limit as number) || 50;
    const data = (await payloadFetch(
      payloadQueryPath('posts', {
        limit,
        sort: '-publishedDate',
        depth: 0,
        'where[publish_status][equals]':
          typeof args.status === 'string' ? args.status : undefined,
      }),
    )) as { docs: Record<string, unknown>[] };
    const posts = data.docs.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      group: p.group,
      publish_status: p.publish_status,
      publishedDate: p.publishedDate,
      excerpt: p.excerpt,
      previewUrl: buildPreviewUrl(p.previewToken),
    }));
    return { content: [{ type: 'text', text: JSON.stringify(posts, null, 2) }] };
  },

  async get_post(args) {
    const data = (await payloadFetch(
      payloadQueryPath('posts', {
        'where[slug][equals]': args.slug as string,
        limit: 1,
        depth: 0,
      }),
    )) as { docs: Record<string, unknown>[] };
    if (!data.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };
    const doc = data.docs[0];
    const enriched = { ...doc, previewUrl: buildPreviewUrl(doc.previewToken) };
    return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
  },

  async create_post(args) {
    const slug =
      (args.slug as string) ||
      (args.title as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const publishStatusError = validatePublishStatusInput(args.publish_status);
    if (publishStatusError) return publishStatusError;

    const publish_status = (args.publish_status as string) || 'draft';

    // Discoverability: pass through what the caller supplied. We don't default
    // canonical_path here — the project URL part number is computed from the
    // post's sorted position in its group, and this tool can't know that
    // position before the post is created (and even after, raw `order` isn't
    // the same as the part number when peers are reordered).
    const discoverability = (args.discoverability as Record<string, unknown>) || {};

    const publishedDate = args.publishedDate ?? todayInSiteTz();
    const publishedDateError = validatePublishedDateInput(publishedDate);
    if (publishedDateError) return publishedDateError;

    const scheduledPublishDateError = validateScheduledPublishDateInput(
      args.scheduledPublishDate,
    );
    if (scheduledPublishDateError) return scheduledPublishDateError;
    if (publish_status === 'scheduled' && args.scheduledPublishDate === undefined) {
      return toolError('scheduledPublishDate is required when publish_status is scheduled.');
    }

    const body: Record<string, unknown> = {
      title: args.title,
      slug,
      excerpt: args.excerpt,
      content: await markdownToLexical(args.content as string),
      publishedDate,
      publish_status,
    };

    if (args.group !== undefined) body.group = args.group;
    if (args.chapter !== undefined) body.chapter = args.chapter;
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

    // skipNewsletter suppresses scheduled Postmark delivery.
    if (args.skipNewsletter === true) body.suppressNewsletter = true;

    if (args.meta) body.meta = args.meta;
    body.discoverability = discoverability;

    const data = (await payloadFetch('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { doc?: { id?: string | number; slug?: string } };

    const createdSlug = data.doc?.slug ?? slug;
    const createdId = data.doc?.id;
    const detail = createdId === undefined ? createdSlug : `${createdSlug} (id: ${createdId})`;
    const adminUrl = createdId === undefined ? '' : `\nAdmin URL: /admin/collections/posts/${createdId}`;

    return {
      content: [
        { type: 'text', text: `Created post: ${detail}${adminUrl}` },
      ],
    };
  },

  async update_post(args) {
    const publishStatusError = validatePublishStatusInput(args.publish_status);
    if (publishStatusError) return publishStatusError;

    if (args.publishedDate !== undefined) {
      const publishedDateError = validatePublishedDateInput(args.publishedDate);
      if (publishedDateError) return publishedDateError;
    }

    const scheduledPublishDateError = validateScheduledPublishDateInput(
      args.scheduledPublishDate,
    );
    if (scheduledPublishDateError) return scheduledPublishDateError;

    const found = (await payloadFetch(
      payloadQueryPath('posts', {
        'where[slug][equals]': args.slug as string,
        limit: 1,
        depth: 0,
      }),
    )) as { docs: { id: number }[] };
    if (!found.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };

    const id = found.docs[0].id;
    const payload: Record<string, unknown> = {};

    if (args.title !== undefined) payload.title = args.title;
    if (args.excerpt !== undefined) payload.excerpt = args.excerpt;
    if (args.content !== undefined)
      payload.content = await markdownToLexical(args.content as string);
    if (args.publishedDate !== undefined) payload.publishedDate = args.publishedDate;
    if (args.group !== undefined) payload.group = args.group;
    if (args.chapter !== undefined) payload.chapter = args.chapter;
    if (args.order !== undefined) payload.order = args.order;
    if (args.author !== undefined) payload.author = args.author;
    if (args.scheduledPublishDate !== undefined)
      payload.scheduledPublishDate = args.scheduledPublishDate;
    if (args.newsletterHeading !== undefined) payload.newsletterHeading = args.newsletterHeading;
    if (args.newsletterDescription !== undefined)
      payload.newsletterDescription = args.newsletterDescription;

    if (args.publish_status !== undefined) {
      payload.publish_status = args.publish_status;
    }

    if (Array.isArray(args.tags)) {
      payload.tags = (args.tags as string[]).map((t) => ({ tag: t }));
    }

    if (args.skipNewsletter === true) payload.suppressNewsletter = true;
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
    const data = (await payloadFetch(payloadQueryPath('pages', { pagination: false, depth: 0 }))) as {
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
      payloadQueryPath('pages', {
        'where[slug][equals]': args.slug as string,
        limit: 1,
        depth: 0,
      }),
    )) as { docs: unknown[] };
    if (!data.docs.length) return { content: [{ type: 'text', text: 'Page not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs[0], null, 2) }] };
  },

  async update_page(args) {
    const found = (await payloadFetch(
      payloadQueryPath('pages', {
        'where[slug][equals]': args.slug as string,
        limit: 1,
        depth: 0,
      }),
    )) as { docs: { id: number }[] };
    if (!found.docs.length) return { content: [{ type: 'text', text: 'Page not found.' }] };

    const id = found.docs[0].id;
    const payload: Record<string, unknown> = {};
    if (args.title !== undefined) payload.title = args.title;
    if (args.excerpt !== undefined) payload.excerpt = args.excerpt;
    if (args.content !== undefined) payload.content = await markdownToLexical(args.content as string);

    await payloadFetch(`/pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return { content: [{ type: 'text', text: `Updated page: ${args.slug}` }] };
  },

  // ---- Groups ----

  async list_groups() {
    const data = (await payloadFetch(payloadQueryPath('groups', { pagination: false, depth: 0 }))) as {
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
    const data = (await payloadFetch(payloadQueryPath('books', { pagination: false, depth: 0 }))) as {
      docs: unknown[];
    };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs, null, 2) }] };
  },

  // ---- Projects ----

  async list_projects() {
    const data = (await payloadFetch(payloadQueryPath('groups', { pagination: false, depth: 0 }))) as {
      docs: unknown[];
    };
    return { content: [{ type: 'text', text: JSON.stringify(data.docs, null, 2) }] };
  },

  // ---- Media ----

  async upload_image(args) {
    const doc = await uploadImageFile({
      filePath: args.filePath as string | undefined,
      fileContent: args.fileContent as string | undefined,
      filename: args.filename as string | undefined,
      alt: args.alt as string | undefined,
      caption: args.caption as string | undefined,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { id: doc.id, url: doc.url, filename: doc.filename, alt: doc.alt },
            null,
            2,
          ),
        },
      ],
    };
  },

  async upload_and_embed_image(args) {
    const slug = args.slug as string;
    const position = (args.position as 'append' | 'prepend') ?? 'append';

    const found = (await payloadFetch(
      payloadQueryPath('posts', {
        'where[slug][equals]': slug,
        limit: 1,
        depth: 0,
      }),
    )) as { docs: { id: number; content?: LexicalRoot }[] };
    if (!found.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };
    const post = found.docs[0];

    const media = await uploadImageFile({
      filePath: args.filePath as string | undefined,
      fileContent: args.fileContent as string | undefined,
      filename: args.filename as string | undefined,
      alt: args.alt as string | undefined,
      caption: args.caption as string | undefined,
    });

    const uploadNode = {
      type: 'upload',
      version: 3,
      format: '',
      fields: {},
      relationTo: 'media',
      value: media.id,
    };

    const existing = post.content;
    const root: LexicalRoot['root'] =
      existing?.root ?? {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [],
      };
    const children = Array.isArray(root.children) ? root.children : [];
    const nextChildren =
      position === 'prepend' ? [uploadNode, ...children] : [...children, uploadNode];

    await payloadFetch(`/posts/${post.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: { root: { ...root, children: nextChildren } } }),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              slug,
              media: { id: media.id, url: media.url, filename: media.filename },
              position,
            },
            null,
            2,
          ),
        },
      ],
    };
  },

  async repair_post_image_markdown(args) {
    const dryRun = args.dryRun === true;
    const onlySlug = typeof args.slug === 'string' ? (args.slug as string) : null;

    const posts: { id: number; slug: string; content?: LexicalRoot }[] = [];
    if (onlySlug) {
      const found = (await payloadFetch(
        payloadQueryPath('posts', {
          'where[slug][equals]': onlySlug,
          limit: 1,
          depth: 0,
        }),
      )) as { docs: { id: number; slug: string; content?: LexicalRoot }[] };
      if (!found.docs.length) return { content: [{ type: 'text', text: 'Post not found.' }] };
      posts.push(found.docs[0]);
    } else {
      let page = 1;
      while (true) {
        const data = (await payloadFetch(
          payloadQueryPath('posts', { limit: 50, page, depth: 0 }),
        )) as {
          docs: { id: number; slug: string; content?: LexicalRoot }[];
          hasNextPage: boolean;
        };
        posts.push(...data.docs);
        if (!data.hasNextPage) break;
        page++;
      }
    }

    const mediaCache = new Map<string, number | null>();
    async function lookupMedia(filename: string): Promise<number | null> {
      if (mediaCache.has(filename)) return mediaCache.get(filename)!;
      const data = (await payloadFetch(
        payloadQueryPath('media', {
          'where[filename][equals]': filename,
          limit: 1,
          depth: 0,
        }),
      )) as { docs: { id: number }[] };
      const id = data.docs[0]?.id ?? null;
      mediaCache.set(filename, id);
      return id;
    }

    const IMG_RE = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;
    const HR_RE = /^---\s*$/;
    const PLACEHOLDER_RE = /^!\[[^\]:]+:[^\]]+\]\(\)\s*$/;
    const LINK_RE = /(?<!\!)\[[^\]]+\]\([^)]+\)/;
    const YT_URL_GLOBAL_RE =
      /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=([\w-]{11})|embed\/([\w-]{11})|shorts\/([\w-]{11})|v\/([\w-]{11}))|youtu\.be\/([\w-]{11}))[^\s\])>]*/;

    const report: Array<{
      id: number;
      slug: string;
      images: { index: number; filename: string; mediaId: number }[];
      hrs: number;
      links: { index: number; sample: string }[];
      youtube: { index: number; videoId: string; caption?: string }[];
      unknown: { index: number; filename: string; url: string }[];
      patched: boolean;
    }> = [];

    for (const post of posts) {
      const root = post.content?.root;
      if (!root || !Array.isArray(root.children)) continue;

      const newChildren: unknown[] = [];
      const images: { index: number; filename: string; mediaId: number }[] = [];
      const links: { index: number; sample: string }[] = [];
      const youtube: { index: number; videoId: string; caption?: string }[] = [];
      const unknown: { index: number; filename: string; url: string }[] = [];
      let hrs = 0;

      for (let i = 0; i < root.children.length; i++) {
        const c = root.children[i] as {
          type?: string;
          children?: { type?: string; text?: string }[];
        };
        if (c?.type === 'paragraph') {
          const allChildrenAreText =
            (c.children ?? []).every((ch) => ch?.type === 'text');
          const text = (c.children ?? [])
            .filter((ch) => ch?.type === 'text')
            .map((ch) => ch.text ?? '')
            .join('');
          const trimmed = text.trim();
          if (!PLACEHOLDER_RE.test(trimmed)) {
            // 1) standalone media image
            const m = IMG_RE.exec(trimmed);
            if (m) {
              const url = m[2];
              const filename = (url.split('?')[0].split('#')[0].split('/').pop() ?? '').trim();
              const mediaId = filename ? await lookupMedia(filename) : null;
              if (mediaId != null) {
                newChildren.push({
                  type: 'upload',
                  version: 3,
                  format: '',
                  fields: {},
                  relationTo: 'media',
                  value: mediaId,
                });
                images.push({ index: i, filename, mediaId });
                continue;
              }
              unknown.push({ index: i, filename, url });
            }
            // 2) horizontal rule
            else if (HR_RE.test(trimmed)) {
              newChildren.push({ type: 'horizontalrule', version: 1 });
              hrs++;
              continue;
            }
            // 3) YouTube URL anywhere in a text-only paragraph
            else if (allChildrenAreText) {
              const yt = YT_URL_GLOBAL_RE.exec(trimmed);
              if (yt) {
                const videoId = yt[1] || yt[2] || yt[3] || yt[4] || yt[5];
                let captionRaw = (trimmed.slice(0, yt.index) + trimmed.slice(yt.index + yt[0].length)).trim();
                captionRaw = captionRaw
                  .replace(/^\[+\s*/, '')
                  .replace(/\s*\]+$/, '')
                  .replace(/^(?:video\s+embed|video|youtube|watch)\s*:\s*/i, '')
                  .replace(/[\s—–-]+$/, '')
                  .replace(/^[\s—–-]+/, '')
                  .trim();
                const fields: Record<string, string> = { videoId };
                if (captionRaw) fields.caption = captionRaw;
                newChildren.push({
                  type: 'block',
                  version: 2,
                  format: '',
                  fields: { blockType: 'youtube', ...fields },
                });
                youtube.push({ index: i, videoId, caption: captionRaw || undefined });
                continue;
              }
              // 4) literal markdown link inside paragraph text → re-parse the line
              if (LINK_RE.test(trimmed)) {
                const reparsed = (await markdownToLexical(text)) as LexicalRoot | undefined;
                const reparsedChildren = reparsed?.root?.children;
                if (Array.isArray(reparsedChildren) && reparsedChildren.length > 0) {
                  for (const rc of reparsedChildren) newChildren.push(rc);
                  links.push({ index: i, sample: text.slice(0, 120) });
                  continue;
                }
              }
            }
          }
        }
        newChildren.push(c);
      }

      const totalChanges = images.length + hrs + links.length + youtube.length;
      if (totalChanges === 0) continue;

      let patched = false;
      if (!dryRun) {
        await payloadFetch(`/posts/${post.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ content: { root: { ...root, children: newChildren } } }),
        });
        patched = true;
      }
      report.push({ id: post.id, slug: post.slug, images, hrs, links, youtube, unknown, patched });
    }

    const totals = report.reduce(
      (acc, r) => ({
        images: acc.images + r.images.length,
        hrs: acc.hrs + r.hrs,
        links: acc.links + r.links.length,
        youtube: acc.youtube + r.youtube.length,
        unknown: acc.unknown + r.unknown.length,
      }),
      { images: 0, hrs: 0, links: 0, youtube: 0, unknown: 0 },
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              dryRun,
              postsScanned: posts.length,
              postsChanged: report.length,
              totals,
              posts: report,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type LexicalRoot = {
  root: {
    type: 'root';
    version: number;
    direction: null | 'ltr' | 'rtl';
    format: string;
    indent: number;
    children: unknown[];
  };
};

async function uploadImageFile(opts: {
  filePath?: string;
  fileContent?: string;
  filename?: string;
  alt?: string;
  caption?: string;
}): Promise<{ id: number; url?: string; filename?: string; alt?: string }> {
  let fileBuffer: Buffer;
  let filename: string;

  if (opts.fileContent) {
    if (!opts.filename) {
      throw new Error('`filename` is required when uploading via `fileContent`.');
    }
    // Allow data-URI parameters (charset, name, etc.) between the mediatype
    // and the `;base64,` marker. The non-greedy `.*?` keeps the match anchored
    // at the first `;base64,` so we don't eat past it into the payload.
    const stripped = opts.fileContent.startsWith('data:')
      ? opts.fileContent.replace(/^data:.*?;base64,/, '')
      : opts.fileContent;
    fileBuffer = Buffer.from(stripped, 'base64');
    filename = basename(opts.filename);
  } else if (opts.filePath) {
    // Refuse filePath when the MCP is deployed (Vercel sets VERCEL=1). A
    // hosted server reading paths from a client request would let any caller
    // with a valid API key exfiltrate .env, /etc/passwd, etc. The local
    // stdio MCP runs without VERCEL set and keeps filePath support.
    if (process.env.VERCEL) {
      throw new Error(
        '`filePath` is not supported by the hosted MCP — pass `fileContent` (base64) + `filename` instead.',
      );
    }
    fileBuffer = readFileSync(opts.filePath);
    filename = basename(opts.filePath);
  } else {
    throw new Error('Provide either `filePath` (local MCP) or `fileContent` + `filename` (hosted MCP).');
  }

  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);
  if (opts.alt) form.append('alt', opts.alt);
  if (opts.caption) form.append('caption', opts.caption);

  const headers: Record<string, string> = {};
  const key = getApiKey();
  if (key) headers['Authorization'] = `users API-Key ${key}`;

  const res = await fetch(`${getBaseUrl()}/api/media`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Media upload failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    doc?: { id: number; url?: string; filename?: string; alt?: string };
  };
  if (!data.doc) throw new Error('Media upload succeeded but response had no doc.');
  return data.doc;
}
