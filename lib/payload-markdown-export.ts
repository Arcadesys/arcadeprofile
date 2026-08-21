import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import matter from 'gray-matter';

import {
  MARKDOWN_GROUP_MANIFEST,
  markdownGroupSchema,
  markdownPostFrontmatterSchema,
  type MarkdownPostFrontmatter,
} from './markdown-posts';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'sent';

export interface PayloadMedia {
  id?: string | number;
  filename?: string | null;
  alt?: string | null;
  url?: string | null;
}

export interface PayloadPost {
  id: string | number;
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  publishedDate?: unknown;
  scheduledPublishDate?: unknown;
  updatedAt?: unknown;
  publish_status?: unknown;
  group?: unknown;
  order?: unknown;
  tags?: unknown;
  meta?: unknown;
  content?: unknown;
}

export interface PayloadGroup {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  jacketDescription?: unknown;
  tags?: unknown;
  chapters?: unknown;
  meta?: unknown;
  image?: unknown;
  href?: unknown;
  external?: unknown;
  featured?: unknown;
  homeHighlight?: unknown;
  category?: unknown;
  status?: unknown;
  format?: unknown;
  projectCTA?: unknown;
  resources?: unknown;
  relatedPostSlugs?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
}

type LexicalNode = {
  type?: unknown;
  text?: unknown;
  format?: unknown;
  url?: unknown;
  tag?: unknown;
  listType?: unknown;
  fields?: unknown;
  value?: unknown;
  children?: unknown;
};

export interface ExportRecord {
  id: string;
  slug?: string;
  group?: string;
  status: string;
  disposition: 'exported' | 'excluded' | 'blocked';
  reason?: string;
  sourceHash: string;
  file?: string;
}

export interface ParityReport {
  version: 1;
  generatedAt: string;
  dryRun: boolean;
  source: { posts: number; groups: number; rawSourceHashes: Record<string, string> };
  totals: {
    source: number;
    exported: number;
    excluded: number;
    blocked: number;
    byStatus: Record<string, number>;
    byGroup: Record<string, number>;
    media: { total: number; missingMeaningfulAlt: number; items: Array<{ payloadMediaId: string; filename?: string; alt?: string }> };
    unsupportedNodes: number;
    duplicates: { ids: string[]; slugs: string[]; targets: string[] };
  };
  records: ExportRecord[];
  validation: { passed: boolean; errors: string[] };
}

export interface ExportPayloadPostsOptions {
  posts: readonly PayloadPost[];
  groups: readonly PayloadGroup[];
  now?: Date;
  dryRun?: boolean;
  stagingDirectory?: string;
  writeFile?: (filePath: string, contents: string) => Promise<void>;
}

export interface ExportPayloadPostsResult {
  report: ParityReport;
  files: Map<string, string>;
}

export interface PayloadPage<T> { docs?: T[]; page?: number; totalPages?: number }

/** Pagination is injectable so callers can keep transport authentication outside this module. */
export async function collectPayloadPages<T>(fetchPage: (page: number) => Promise<PayloadPage<T>>): Promise<T[]> {
  const docs: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page);
    docs.push(...(result.docs ?? []));
    if (!result.totalPages || page >= result.totalPages) return docs;
  }
}

const allowedStatuses = new Set<PostStatus>(['draft', 'scheduled', 'published', 'sent']);
const legacyMediaUrl = /(?:^|["'`(])(?:https?:\/\/[^\s)]+)?\/?api\/media(?:\/|\b)|payloadcms|\/media\//i;

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && markdownPostFrontmatterSchema.shape.publishDate.safeParse(value).success;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function childrenOf(node: LexicalNode): LexicalNode[] | undefined {
  return Array.isArray(node.children) ? node.children.filter((child): child is LexicalNode => Boolean(object(child))) : undefined;
}

function formatText(text: string, format: unknown): string {
  const flags = typeof format === 'number' ? format : 0;
  const escaped = text.replace(/([\\`*_{}\[\]<>])/g, '\\$1');
  if (flags & 16) return `\`${escaped}\``;
  let result = escaped;
  if (flags & 1) result = `**${result}**`;
  if (flags & 2) result = `*${result}*`;
  if (flags & 4) result = `~~${result}~~`;
  return result;
}

function mediaFrom(value: unknown): PayloadMedia | undefined {
  const item = object(value) ?? { id: value };
  const id = item.id ?? item.value;
  if (typeof id !== 'string' && typeof id !== 'number') return undefined;
  return { id, filename: string(item.filename) ?? null, alt: string(item.alt) ?? null, url: string(item.url) ?? null };
}

function meaningfulAlt(media: PayloadMedia): boolean {
  return Boolean(media.alt && media.alt.trim().length >= 3 && !/^image$/i.test(media.alt.trim()));
}

type Conversion = { markdown?: string; unsupported: string[]; media: PayloadMedia[]; errors: string[] };

function convertLexical(content: unknown): Conversion {
  const root = object(object(content)?.root);
  const nodes = root && Array.isArray(root.children) ? root.children.filter((node): node is LexicalNode => Boolean(object(node))) : undefined;
  if (!nodes) return { unsupported: [], media: [], errors: ['content.root.children is missing'] };
  const unsupported: string[] = [];
  const media: PayloadMedia[] = [];

  const inline = (items: LexicalNode[] = []): string => items.map((node) => {
    const type = string(node.type);
    if (type === 'text') return formatText(typeof node.text === 'string' ? node.text : '', node.format);
    if (type === 'linebreak') return '  \n';
    if (type === 'link' || type === 'autolink') {
      const url = string(node.url);
      if (!url) { unsupported.push(`${type}: missing url`); return ''; }
      return `[${inline(childrenOf(node) ?? [])}](${url})`;
    }
    unsupported.push(`inline:${type ?? 'unknown'}`);
    return '';
  }).join('');

  const block = (items: LexicalNode[], depth = 0): string => items.map((node) => {
    const type = string(node.type);
    const children = childrenOf(node) ?? [];
    if (type === 'paragraph') return inline(children);
    if (type === 'heading') {
      const tag = string(node.tag) ?? string(object(node.fields)?.tag) ?? 'h2';
      const level = /^h[1-6]$/.test(tag) ? Number(tag[1]) : 2;
      return `${'#'.repeat(level)} ${inline(children)}`;
    }
    if (type === 'quote') return children.map((child) => `> ${inline(childrenOf(child) ?? [])}`).join('\n');
    if (type === 'horizontalrule') return '---';
    if (type === 'list') {
      const ordered = node.listType === 'number' || object(node.fields)?.listType === 'number';
      return children.map((child, childIndex) => {
        if (string(child.type) !== 'listitem') { unsupported.push(`list child:${string(child.type) ?? 'unknown'}`); return ''; }
        const childNodes = childrenOf(child) ?? [];
        const nested = childNodes.filter((item) => string(item.type) === 'list');
        const text = inline(childNodes.filter((item) => string(item.type) !== 'list'));
        return `${'  '.repeat(depth)}${ordered ? `${childIndex + 1}.` : '-'} ${text}${nested.length ? `\n${block(nested, depth + 1)}` : ''}`;
      }).join('\n');
    }
    if (type === 'youtube') {
      const fields = object(node.fields);
      const videoId = string(fields?.videoId);
      if (!videoId) { unsupported.push('youtube: missing videoId'); return ''; }
      const caption = string(fields?.caption);
      return `[YouTube video${caption ? `: ${caption}` : ''}](https://www.youtube.com/watch?v=${videoId})`;
    }
    if (type === 'upload') {
      const item = mediaFrom(object(node.fields) ?? node.value);
      if (!item) { unsupported.push('upload: missing media id'); return ''; }
      media.push(item);
      return `> **Media migration required:** ${item.alt ?? 'Missing alt text'} (Payload upload ${item.id}).`;
    }
    unsupported.push(`block:${type ?? 'unknown'}`);
    return '';
  }).filter(Boolean).join('\n\n');

  const markdown = block(nodes).trim();
  return { markdown: markdown || undefined, unsupported, media, errors: markdown ? [] : ['content has no convertible Markdown body'] };
}

function tags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.map((tag) => string(typeof tag === 'string' ? tag : object(tag)?.tag)).filter((tag): tag is string => Boolean(tag));
  return result.length ? result : undefined;
}

function groupManifest(group: PayloadGroup): string | undefined {
  const groupSlug = string(group.slug);
  const groupTitle = string(group.title);
  if (!groupSlug || !groupTitle) return undefined;
  const meta = object(group.meta);
  const projectCTA = object(group.projectCTA);
  const chapters = Array.isArray(group.chapters)
    ? group.chapters.map(object).filter((item): item is Record<string, unknown> => Boolean(item)).map((item) => ({
        title: string(item.title),
        slug: string(item.slug),
      })).filter((item): item is { title: string; slug: string } => Boolean(item.title && item.slug))
    : undefined;
  const resources = Array.isArray(group.resources)
    ? group.resources.map(object).filter((item): item is Record<string, unknown> => Boolean(item)).map((item) => ({
        label: string(item.label),
        href: string(item.href),
        kind: string(item.kind),
        ...(string(item.description) ? { description: string(item.description) } : {}),
        ...(typeof item.external === 'boolean' ? { external: item.external } : {}),
      })).filter((item): item is { label: string; href: string; kind: string; description?: string; external?: boolean } => Boolean(item.label && item.href && item.kind))
    : undefined;
  const relatedPostSlugs = Array.isArray(group.relatedPostSlugs)
    ? group.relatedPostSlugs.map((item) => string(typeof item === 'string' ? item : object(item)?.slug)).filter((item): item is string => Boolean(item))
    : undefined;
  const image = object(group.image);
  const imageUrl = string(typeof group.image === 'string' ? group.image : image?.url);
  if (imageUrl && legacyMediaUrl.test(imageUrl)) return undefined;
  const intro = group.jacketDescription ? convertLexical(group.jacketDescription) : undefined;
  if (intro && (intro.errors.length || intro.unsupported.length || intro.media.length || !intro.markdown)) return undefined;
  const parsed = markdownGroupSchema.safeParse({
    slug: groupSlug,
    title: groupTitle,
    ...(typeof group.description === 'string' ? { description: group.description } : {}),
    ...(intro?.markdown ? { introMarkdown: intro.markdown } : {}),
    ...(tags(group.tags) ? { tags: tags(group.tags) } : {}),
    ...(chapters?.length ? { chapters } : {}),
    ...(string(meta?.title) || string(meta?.description) ? { meta: {
      ...(string(meta?.title) ? { title: string(meta?.title) } : {}),
      ...(string(meta?.description) ? { description: string(meta?.description) } : {}),
    } } : {}),
    project: {
      ...(imageUrl ? { image: imageUrl } : {}),
      ...(string(group.href) ? { href: string(group.href) } : {}),
      ...(typeof group.external === 'boolean' ? { external: group.external } : {}),
      ...(typeof group.featured === 'boolean' ? { featured: group.featured } : {}),
      ...(typeof group.homeHighlight === 'boolean' ? { homeHighlight: group.homeHighlight } : {}),
      ...(string(group.category) ? { category: string(group.category) } : {}),
      ...(string(group.status) ? { status: string(group.status) } : {}),
      ...(group.format === 'serial' || group.format === 'collection' ? { format: group.format } : {}),
      ...(projectCTA && (string(projectCTA.label) || string(projectCTA.href) || string(projectCTA.type)) ? { primaryCTA: {
        ...(string(projectCTA.label) ? { label: string(projectCTA.label) } : {}),
        ...(string(projectCTA.href) ? { href: string(projectCTA.href) } : {}),
        ...(string(projectCTA.type) ? { type: string(projectCTA.type) } : {}),
      } } : {}),
      ...(resources?.length ? { resources } : {}),
      ...(relatedPostSlugs?.length ? { relatedPostSlugs } : {}),
      ...(validDate(group.updatedAt) ? { updatedAt: group.updatedAt } : {}),
      ...(validDate(group.createdAt) ? { createdAt: group.createdAt } : {}),
    },
  });
  if (!parsed.success) return undefined;
  return `${JSON.stringify(parsed.data, null, 2)}\n`;
}

function groupSlug(value: unknown, groupById: ReadonlyMap<string, string>): string | undefined {
  const populatedSlug = string(object(value)?.slug);
  if (populatedSlug) return populatedSlug;
  const scalar = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  return scalar ? groupById.get(scalar) ?? scalar : undefined;
}

function heroFrom(post: PayloadPost): PayloadMedia | undefined {
  return mediaFrom(object(post.meta)?.image);
}

function summarize(report: ParityReport): void {
  const { totals } = report;
  console.log(`Payload Markdown export (${report.dryRun ? 'dry run' : 'staged write'}): ${totals.source} source = ${totals.exported} exported + ${totals.excluded} excluded + ${totals.blocked} blocked.`);
  console.log(`Status: ${Object.entries(totals.byStatus).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}. Groups: ${Object.entries(totals.byGroup).map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}.`);
  console.log(`Media: ${totals.media.total} references, ${totals.media.missingMeaningfulAlt} missing meaningful alt; unsupported nodes: ${totals.unsupportedNodes}; duplicate findings: ${totals.duplicates.ids.length + totals.duplicates.slugs.length + totals.duplicates.targets.length}. Validation: ${report.validation.passed ? 'passed' : 'failed'}.`);
}

/** Convert a supplied, read-only Payload inventory. It never contacts Payload itself. */
export async function exportPayloadPosts(options: ExportPayloadPostsOptions): Promise<ExportPayloadPostsResult> {
  const dryRun = options.dryRun ?? true;
  if (!dryRun && !options.stagingDirectory) throw new Error('A caller-selected stagingDirectory is required for writes.');
  if (!dryRun && options.stagingDirectory) {
    const canonicalDirectory = path.resolve(process.cwd(), 'content', 'posts');
    const selectedDirectory = path.resolve(options.stagingDirectory);
    if (selectedDirectory === canonicalDirectory || selectedDirectory.startsWith(`${canonicalDirectory}${path.sep}`)) {
      throw new Error('The canonical content/posts directory is never a staging target.');
    }
  }
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('Exporter requires a valid current time.');
  const groups = new Set(options.groups.map((group) => string(group.slug)).filter((slug): slug is string => Boolean(slug)));
  const groupById = new Map(
    options.groups
      .map((group) => [group.id == null ? undefined : String(group.id), string(group.slug)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );
  const records: ExportRecord[] = [];
  const files = new Map<string, string>();
  const errors: string[] = [];
  const byStatus: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  const sourceHashes: Record<string, string> = {};
  const duplicateIds: string[] = [];
  const duplicateSlugs: string[] = [];
  const duplicateTargets: string[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenTargets = new Set<string>();
  let mediaTotal = 0;
  let missingMeaningfulAlt = 0;
  const mediaItems: Array<{ payloadMediaId: string; filename?: string; alt?: string }> = [];
  let unsupportedNodes = 0;

  for (const group of options.groups) {
    const slug = string(group.slug);
    const manifest = groupManifest(group);
    if (!slug || !manifest) {
      errors.push(`group ${slug ?? '(missing slug)'} cannot be represented as a Markdown manifest`);
      continue;
    }
    files.set(path.posix.join(slug, MARKDOWN_GROUP_MANIFEST), manifest);
  }

  for (const post of options.posts) {
    const id = String(post.id);
    const sourceHash = hash(post);
    sourceHashes[id] = sourceHash;
    const status = string(post.publish_status) ?? 'missing';
    const slug = string(post.slug);
    const group = groupSlug(post.group, groupById);
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    if (group) byGroup[group] = (byGroup[group] ?? 0) + 1;
    const record: ExportRecord = { id, slug, group, status, disposition: 'blocked', sourceHash };

    if (seenIds.has(id)) { duplicateIds.push(id); record.reason = 'duplicate Payload id'; records.push(record); continue; }
    seenIds.add(id);
    if (!allowedStatuses.has(status as PostStatus)) { record.reason = 'unknown publish status'; records.push(record); continue; }
    if (status === 'draft') { record.disposition = 'excluded'; record.reason = 'drafts are inventory only'; records.push(record); continue; }
    if (!slug || !group || !groups.has(group)) { record.reason = !group || !groups.has(group) ? 'unresolved group' : 'missing slug'; records.push(record); continue; }
    if (seenSlugs.has(slug)) { duplicateSlugs.push(slug); record.reason = 'duplicate slug'; records.push(record); continue; }
    seenSlugs.add(slug);
    if (!validDate(post.publishedDate)) { record.reason = 'invalid publishedDate RFC3339 date-time'; records.push(record); continue; }
    if (status === 'scheduled') {
      if (!validDate(post.scheduledPublishDate) || Date.parse(post.scheduledPublishDate) !== Date.parse(post.publishedDate) || Date.parse(post.scheduledPublishDate) <= now.getTime()) {
        record.reason = 'scheduled post lacks an unambiguous future publish date'; records.push(record); continue;
      }
    }
    const conversion = convertLexical(post.content);
    mediaTotal += conversion.media.length;
    const hero = heroFrom(post);
    if (hero) mediaTotal += 1;
    for (const item of [...conversion.media, ...(hero ? [hero] : [])]) {
      mediaItems.push({ payloadMediaId: String(item.id), ...(item.filename ? { filename: item.filename } : {}), ...(item.alt ? { alt: item.alt } : {}) });
      if (!meaningfulAlt(item)) missingMeaningfulAlt += 1;
    }
    unsupportedNodes += conversion.unsupported.length;
    if (conversion.unsupported.length) { record.reason = `unsupported Lexical nodes: ${conversion.unsupported.join(', ')}`; records.push(record); continue; }
    if (conversion.errors.length || !conversion.markdown) { record.reason = conversion.errors.join('; '); records.push(record); continue; }
    if ([...conversion.media, ...(hero ? [hero] : [])].some((item) => !meaningfulAlt(item))) { record.reason = 'media is missing meaningful alt text'; records.push(record); continue; }
    const meta = object(post.meta);
    const frontmatter = markdownPostFrontmatterSchema.safeParse({
      id,
      title: string(post.title),
      slug,
      group,
      publishDate: post.publishedDate,
      ...(typeof post.order === 'number' ? { order: post.order } : {}),
      ...(validDate(post.updatedAt) ? { updatedDate: post.updatedAt } : {}),
      ...(string(post.excerpt) ? { excerpt: string(post.excerpt) } : {}),
      ...(tags(post.tags) ? { tags: tags(post.tags) } : {}),
      ...(hero ? { hero: { src: `payload-media:${hero.id}`, alt: hero.alt } } : {}),
      ...(string(meta?.title) || string(meta?.description) ? { seo: { ...(string(meta?.title) ? { title: string(meta?.title) } : {}), ...(string(meta?.description) ? { description: string(meta?.description) } : {}) } } : {}),
    });
    if (!frontmatter.success) { record.reason = `frontmatter validation failed: ${frontmatter.error.issues.map((issue) => issue.message).join(', ')}`; records.push(record); continue; }
    const relative = path.posix.join(group, `${slug}.md`);
    if (seenTargets.has(relative)) { duplicateTargets.push(relative); record.reason = 'duplicate export target'; records.push(record); continue; }
    const markdown = matter.stringify(`${conversion.markdown}\n`, frontmatter.data satisfies MarkdownPostFrontmatter);
    if (legacyMediaUrl.test(markdown)) { record.reason = 'legacy Payload media URL detected'; records.push(record); continue; }
    seenTargets.add(relative);
    files.set(relative, markdown);
    record.disposition = 'exported';
    record.file = relative;
    records.push(record);
  }

  const exported = records.filter((record) => record.disposition === 'exported').length;
  const excluded = records.filter((record) => record.disposition === 'excluded').length;
  const blocked = records.filter((record) => record.disposition === 'blocked').length;
  if (options.posts.length !== exported + excluded + blocked) errors.push('accounting invariant failed');
  if (duplicateIds.length || duplicateSlugs.length || duplicateTargets.length) errors.push('duplicate source or export target detected');
  const report: ParityReport = {
    version: 1,
    generatedAt: now.toISOString(),
    dryRun,
    source: { posts: options.posts.length, groups: options.groups.length, rawSourceHashes: sourceHashes },
    totals: { source: options.posts.length, exported, excluded, blocked, byStatus, byGroup, media: { total: mediaTotal, missingMeaningfulAlt, items: mediaItems }, unsupportedNodes, duplicates: { ids: duplicateIds, slugs: duplicateSlugs, targets: duplicateTargets } },
    records,
    validation: { passed: errors.length === 0, errors },
  };
  if (!dryRun && options.stagingDirectory) {
    const write = options.writeFile ?? (async (filePath, contents) => { await mkdir(path.dirname(filePath), { recursive: true }); await writeFile(filePath, contents, 'utf8'); });
    for (const [relative, markdown] of files) await write(path.join(options.stagingDirectory, relative), markdown);
    await write(path.join(options.stagingDirectory, 'parity-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  summarize(report);
  return { report, files };
}
