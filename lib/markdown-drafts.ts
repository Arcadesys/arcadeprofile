import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

export const DEFAULT_MARKDOWN_DRAFTS_DIRECTORY = path.join(process.cwd(), 'content', 'drafts');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const RFC3339_OFFSET_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const slug = z.string().regex(SLUG_RE, 'must be lowercase kebab-case');
const nonEmptyText = z.string().trim().min(1, 'must not be empty');
const rfc3339OffsetDateTime = z.string().refine((value) => {
  const match = RFC3339_OFFSET_RE.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  return calendarDate.getUTCFullYear() === year
    && calendarDate.getUTCMonth() === month - 1
    && calendarDate.getUTCDate() === day
    && Number(hourText) <= 23
    && Number(minuteText) <= 59
    && Number(secondText) <= 59
    && Number.isFinite(Date.parse(value));
}, 'must be an RFC 3339 date-time with a Z or numeric offset');

export const markdownDraftFrontmatterSchema = z.object({
  id: nonEmptyText,
  title: nonEmptyText,
  slug,
  group: slug,
  status: z.literal('draft'),
  source: z.object({
    system: z.literal('payload'),
    updatedAt: rfc3339OffsetDateTime,
    bodySha256: z.string().regex(SHA256_RE, 'must be a lowercase SHA-256 digest'),
  }).strict(),
  excerpt: nonEmptyText.optional(),
  tags: z.array(nonEmptyText).optional(),
  seo: z.object({
    title: nonEmptyText.optional(),
    description: nonEmptyText.optional(),
  }).strict().optional(),
}).strict();

export type MarkdownDraftFrontmatter = z.infer<typeof markdownDraftFrontmatterSchema>;

export interface MarkdownDraft extends MarkdownDraftFrontmatter {
  body: string;
  filePath: string;
}

/** Drafts are deliberately loaded from a tree that no public runtime imports. */
export function loadMarkdownDrafts(contentDirectory = DEFAULT_MARKDOWN_DRAFTS_DIRECTORY): MarkdownDraft[] {
  if (!statSync(contentDirectory, { throwIfNoEntry: false })?.isDirectory()) return [];

  const drafts: MarkdownDraft[] = [];
  for (const groupEntry of readdirSync(contentDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!groupEntry.isDirectory() || groupEntry.name.startsWith('.')) continue;
    const groupPath = path.join(contentDirectory, groupEntry.name);
    for (const file of readdirSync(groupPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filePath = path.join(groupPath, file.name);
      if (file.isDirectory()) throw new Error(`Nested Markdown draft directory ${filePath} is not supported.`);
      if (!file.isFile() || !file.name.endsWith('.md')) continue;
      const { data, content } = matter(readFileSync(filePath, 'utf8'));
      const parsed = markdownDraftFrontmatterSchema.safeParse(data);
      if (!parsed.success) throw new Error(`Invalid draft frontmatter in ${filePath}: ${z.prettifyError(parsed.error)}`);
      const expectedSlug = file.name.slice(0, -'.md'.length);
      if (parsed.data.slug !== expectedSlug) throw new Error(`Draft ${filePath} has slug ${parsed.data.slug}; expected ${expectedSlug} from its filename.`);
      if (parsed.data.group !== groupEntry.name) throw new Error(`Draft ${filePath} has group ${parsed.data.group}; expected ${groupEntry.name} from its directory.`);
      if (!content.trim()) throw new Error(`Draft ${filePath} must have a nonempty Markdown body.`);
      drafts.push({ ...parsed.data, body: content.trim(), filePath });
    }
  }
  return drafts;
}
