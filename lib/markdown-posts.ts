import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

/**
 * This module intentionally uses Node's filesystem APIs. Keep it in server
 * code: Markdown files are the source of truth, not client-bundle data.
 */

export const DEFAULT_MARKDOWN_POSTS_DIRECTORY = path.join(process.cwd(), 'content', 'posts');
export const MARKDOWN_GROUP_MANIFEST = '_group.json';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RFC3339_OFFSET_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRfc3339OffsetDateTime(value: string): boolean {
  const match = RFC3339_OFFSET_RE.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  return (
    calendarDate.getUTCFullYear() === year &&
    calendarDate.getUTCMonth() === month - 1 &&
    calendarDate.getUTCDate() === day &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    Number.isFinite(Date.parse(value))
  );
}

const rfc3339OffsetDateTime = z
  .string()
  .refine(isRfc3339OffsetDateTime, 'must be an RFC 3339 date-time with a Z or numeric offset');

const slug = z.string().regex(SLUG_RE, 'must be lowercase kebab-case');
const nonEmptyText = z.string().trim().min(1, 'must not be empty');
const publicDownloadUrl = z
  .string()
  .refine(
    (value) => value.startsWith('/') || z.url().safeParse(value).success,
    'must be an absolute URL or a root-relative public path',
  );

export const markdownPostFrontmatterSchema = z
  .object({
    id: nonEmptyText,
    title: nonEmptyText,
    slug,
    group: slug,
    publishDate: rfc3339OffsetDateTime,
    order: z.number().int().nonnegative().optional(),
    updatedDate: rfc3339OffsetDateTime.optional(),
    excerpt: nonEmptyText.optional(),
    tags: z.array(nonEmptyText).optional(),
    hero: z
      .object({
        src: nonEmptyText,
        alt: nonEmptyText,
      })
      .strict()
      .optional(),
    seo: z
      .object({
        title: nonEmptyText.optional(),
        description: nonEmptyText.optional(),
      })
      .strict()
      .optional(),
    pdf: z
      .object({
        overrideUrl: publicDownloadUrl.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type MarkdownPostFrontmatter = z.infer<typeof markdownPostFrontmatterSchema>;

export const markdownGroupSchema = z
  .object({
    slug,
    title: nonEmptyText,
    description: z.string().optional(),
    introMarkdown: z.string().trim().min(1).optional(),
    tags: z.array(nonEmptyText).optional(),
    chapters: z
      .array(
        z
          .object({
            title: nonEmptyText,
            slug,
          })
          .strict(),
      )
      .optional(),
    meta: z
      .object({
        title: nonEmptyText.optional(),
        description: nonEmptyText.optional(),
      })
      .strict()
      .optional(),
    project: z
      .object({
        image: nonEmptyText.optional(),
        href: nonEmptyText.optional(),
        external: z.boolean().optional(),
        featured: z.boolean().optional(),
        homeHighlight: z.boolean().optional(),
        category: nonEmptyText.optional(),
        status: nonEmptyText.optional(),
        format: z.enum(['serial', 'collection']).optional(),
        primaryCTA: z
          .object({
            label: nonEmptyText.optional(),
            href: nonEmptyText.optional(),
            type: nonEmptyText.optional(),
          })
          .strict()
          .optional(),
        resources: z
          .array(
            z
              .object({
                label: nonEmptyText,
                href: nonEmptyText,
                kind: nonEmptyText,
                description: z.string().optional(),
                external: z.boolean().optional(),
              })
              .strict(),
          )
          .optional(),
        relatedPostSlugs: z.array(slug).optional(),
        updatedAt: rfc3339OffsetDateTime.optional(),
        createdAt: rfc3339OffsetDateTime.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type MarkdownGroup = z.infer<typeof markdownGroupSchema> & { filePath: string };

export interface MarkdownPost extends MarkdownPostFrontmatter {
  body: string;
  filePath: string;
}

export interface LoadMarkdownPostsOptions {
  /** Defaults to content/posts; tests and migration tools should inject a fixture directory. */
  contentDirectory?: string;
}

export function loadMarkdownGroups(options: LoadMarkdownPostsOptions = {}): MarkdownGroup[] {
  const contentDirectory = options.contentDirectory ?? DEFAULT_MARKDOWN_POSTS_DIRECTORY;
  if (!statSync(/* turbopackIgnore: true */ contentDirectory, { throwIfNoEntry: false })?.isDirectory()) return [];

  const groups: MarkdownGroup[] = [];
  for (const entry of readdirSync(/* turbopackIgnore: true */ contentDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const filePath = path.join(/* turbopackIgnore: true */ contentDirectory, entry.name, MARKDOWN_GROUP_MANIFEST);
    if (!statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`Markdown group ${entry.name} is missing ${filePath}.`);
    }
    const raw = JSON.parse(readFileSync(/* turbopackIgnore: true */ filePath, 'utf8')) as unknown;
    const parsed = markdownGroupSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid Markdown group manifest ${filePath}: ${z.prettifyError(parsed.error)}`);
    }
    if (parsed.data.slug !== entry.name) {
      throw new Error(`Markdown group ${filePath} has slug ${parsed.data.slug}; expected ${entry.name} from its directory.`);
    }
    groups.push({ ...parsed.data, filePath });
  }
  return groups;
}

export function compareMarkdownPosts(a: MarkdownPost, b: MarkdownPost): number {
  if (a.group !== b.group) return a.group.localeCompare(b.group);

  const aOrder = a.order ?? Number.POSITIVE_INFINITY;
  const bOrder = b.order ?? Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) return aOrder - bOrder;

  const publishedDifference = Date.parse(a.publishDate) - Date.parse(b.publishDate);
  if (publishedDifference !== 0) return publishedDifference;

  return a.slug.localeCompare(b.slug);
}

/**
 * Load and validate every Markdown post. Each .md file must be directly under
 * content/posts/<group>/ and its filename and frontmatter must agree.
 */
export function loadMarkdownPosts(options: LoadMarkdownPostsOptions = {}): MarkdownPost[] {
  const contentDirectory = options.contentDirectory ?? DEFAULT_MARKDOWN_POSTS_DIRECTORY;
  if (!statSync(/* turbopackIgnore: true */ contentDirectory, { throwIfNoEntry: false })?.isDirectory()) return [];

  const posts: MarkdownPost[] = [];
  const seenIds = new Map<string, string>();
  const seenSlugs = new Map<string, string>();

  for (const entry of readdirSync(/* turbopackIgnore: true */ contentDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(/* turbopackIgnore: true */ contentDirectory, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md')) {
      throw new Error(`Markdown post ${entryPath} must be inside a group directory.`);
    }
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    for (const file of readdirSync(/* turbopackIgnore: true */ entryPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filePath = path.join(/* turbopackIgnore: true */ entryPath, file.name);
      if (file.isDirectory()) {
        throw new Error(`Nested Markdown directory ${filePath} is not supported.`);
      }
      if (!file.isFile() || !file.name.endsWith('.md')) continue;

      const { data, content } = matter(readFileSync(/* turbopackIgnore: true */ filePath, 'utf8'));
      const parsed = markdownPostFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Invalid frontmatter in ${filePath}: ${z.prettifyError(parsed.error)}`);
      }

      const expectedSlug = file.name.slice(0, -'.md'.length);
      if (parsed.data.slug !== expectedSlug) {
        throw new Error(`Post ${filePath} has slug ${parsed.data.slug}; expected ${expectedSlug} from its filename.`);
      }
      if (parsed.data.group !== entry.name) {
        throw new Error(`Post ${filePath} has group ${parsed.data.group}; expected ${entry.name} from its directory.`);
      }
      if (!content.trim()) {
        throw new Error(`Post ${filePath} must have a nonempty Markdown body.`);
      }
      const existingIdPath = seenIds.get(parsed.data.id);
      if (existingIdPath) {
        throw new Error(`Duplicate Markdown post id ${parsed.data.id} in ${filePath} and ${existingIdPath}.`);
      }
      const existingSlugPath = seenSlugs.get(parsed.data.slug);
      if (existingSlugPath) {
        throw new Error(`Duplicate Markdown post slug ${parsed.data.slug} in ${filePath} and ${existingSlugPath}.`);
      }

      seenIds.set(parsed.data.id, filePath);
      seenSlugs.set(parsed.data.slug, filePath);
      posts.push({ ...parsed.data, body: content.trim(), filePath });
    }
  }

  return posts.sort(compareMarkdownPosts);
}

/**
 * Publish date is the sole visibility control. A future post is absent from
 * all public consumers; callers can pass a fixed time for deterministic tests.
 */
export function selectPublicMarkdownPosts(posts: readonly MarkdownPost[], now: Date = new Date()): MarkdownPost[] {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error('Public-post selector requires a valid current time.');

  return posts
    .filter((post) => Date.parse(post.publishDate) <= nowMs)
    .sort(compareMarkdownPosts);
}
