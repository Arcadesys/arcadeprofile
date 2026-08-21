/**
 * Build-time source for essays exported from Payload.
 *
 * A group becomes readable from this source only after the importer promotes a
 * complete staged export. That avoids a partial Markdown export quietly
 * hiding still-public Payload posts.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

export const ESSAY_GROUP_SLUGS = [
  'arcade-blog',
  'on-writing',
  'pride-essays',
  'the-singularity-log',
  'white-cane-chronicles',
] as const;

const mediaReferenceSchema = z.object({
  payloadMediaId: z.union([z.string(), z.number()]).transform(String),
  alt: z.string().optional(),
  filename: z.string().optional(),
  /** Must be filled after the object has been copied to Vercel Blob. */
  blobUrl: z.string().url().optional(),
});

export const staticEssayFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().default(''),
  publishedDate: z.string().min(1),
  updatedAt: z.string().optional(),
  status: z.enum(['published', 'sent']),
  group: z.object({
    slug: z.enum(ESSAY_GROUP_SLUGS),
    title: z.string().min(1),
    order: z.number().int().nonnegative().optional(),
    chapter: z.string().optional(),
  }),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  newsletter: z.object({
    suppress: z.boolean().default(false),
    heading: z.string().optional(),
    description: z.string().optional(),
  }).default({ suppress: false }),
  discoverability: z.object({
    canonicalPath: z.string().optional(),
    noIndex: z.boolean().optional(),
  }).default({}),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    hero: mediaReferenceSchema.optional(),
  }).default({}),
  media: z.array(mediaReferenceSchema).default([]),
  source: z.object({
    payloadId: z.union([z.string(), z.number()]).transform(String),
    payloadUpdatedAt: z.string().optional(),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});

export type StaticEssayFrontmatter = z.infer<typeof staticEssayFrontmatterSchema>;
export type StaticEssay = StaticEssayFrontmatter & { body: string; filePath: string };

const root = path.join(process.cwd(), 'content', 'essays');
const promotedManifestName = '_manifest.json';

export function sourceHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertNoPayloadMediaUrl(value: unknown, filePath: string): void {
  const serialized = JSON.stringify(value);
  if (/\/(?:api\/)?media\/|payloadcms|\/api\/uploads\//i.test(serialized)) {
    throw new Error(`${filePath}: front matter contains a Payload media URL; copy media to Blob first.`);
  }
}

async function loadGroup(groupSlug: string): Promise<StaticEssay[]> {
  const directory = path.join(root, groupSlug);
  try {
    // A manifest is the importer promotion marker. A directory alone is only staging.
    await readFile(path.join(directory, promotedManifestName), 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files = (await readdir(directory)).filter(file => file.endsWith('.md')).sort();
  const essays = await Promise.all(files.map(async file => {
    const filePath = path.join(directory, file);
    const parsed = matter(await readFile(filePath, 'utf8'));
    assertNoPayloadMediaUrl(parsed.data, filePath);
    const frontmatter = staticEssayFrontmatterSchema.parse(parsed.data);
    if (frontmatter.group.slug !== groupSlug) {
      throw new Error(`${filePath}: group slug does not match its directory.`);
    }
    if (path.basename(file, '.md') !== frontmatter.slug) {
      throw new Error(`${filePath}: filename must match front matter slug.`);
    }
    return { ...frontmatter, body: parsed.content.trim(), filePath };
  }));
  const unique = new Set<string>();
  for (const essay of essays) {
    if (unique.has(essay.slug)) throw new Error(`${directory}: duplicate slug ${essay.slug}.`);
    unique.add(essay.slug);
  }
  return essays.sort((a, b) => (a.group.order ?? Number.MAX_SAFE_INTEGER) - (b.group.order ?? Number.MAX_SAFE_INTEGER) || a.publishedDate.localeCompare(b.publishedDate));
}

export async function getStaticEssays(): Promise<StaticEssay[]> {
  return (await Promise.all(ESSAY_GROUP_SLUGS.map(loadGroup))).flat();
}

export async function getStaticEssayBySlug(slug: string): Promise<StaticEssay | null> {
  return (await getStaticEssays()).find(essay => essay.slug === slug) ?? null;
}
