import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

import assets from '@/data/zoo-collection-assets.json';
import { markdownToEditorialBlocks, type EditorialPiece } from '@/lib/editorial-piece';
import {
  ZOO_COLLECTION_PATH,
  ZOO_COLLECTION_TITLE,
  ZOO_HERO,
} from '@/lib/zoo-collection-meta';

export {
  ZOO_COLLECTION_DESCRIPTION,
  ZOO_COLLECTION_PATH,
  ZOO_COLLECTION_TITLE,
  ZOO_HERO,
  ZOO_HERO_ALT,
} from '@/lib/zoo-collection-meta';

const frontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().min(1),
  author: z.literal('Austen Tucker'),
  description: z.string().min(1),
  source: z.string().min(1),
});

const expected = [
  ['cold-boot', 'Cold Boot'],
  ['gallery-view', 'Gallery View'],
  ['permissions', 'Permissions'],
  ['goodgirl-tv', 'Goodgirl.tv'],
  ['soft-reset', 'Soft Reset'],
  ['open-port', 'Open Port'],
  ['failover', 'Failover'],
] as const;

type Asset = { url: string; sha256: string; bytes: number };
type AssetManifest = {
  hero: Asset & { width: number; height: number };
  galleryArtwork: Asset;
  chapters: Record<string, Asset>;
};

const manifest = assets as AssetManifest;
const contentRoot = path.join(process.cwd(), 'content', 'novels', 'it-takes-a-zoo');

export type ZooChapter = {
  title: string;
  slug: string;
  order: number;
  author: 'Austen Tucker';
  description: string;
  source: string;
  markdown: string;
  wordCount: number;
  readingMinutes: number;
  path: string;
  pdfPath: string;
  pdfUrl: string;
  pdfSha256: string;
};

function loadChapter(slug: string, expectedTitle: string, order: number): ZooChapter {
  const file = path.join(contentRoot, `${slug}.md`);
  const parsed = matter(fs.readFileSync(file, 'utf8'));
  const data = frontmatterSchema.parse(parsed.data);
  if (data.slug !== slug || data.title !== expectedTitle || data.order !== order) {
    throw new Error(`Chapter contract mismatch in ${file}.`);
  }
  const markdown = parsed.content.trim();
  if (!markdown) throw new Error(`${expectedTitle} has no web text.`);
  const asset = manifest.chapters[slug];
  if (!asset?.url) throw new Error(`${expectedTitle} has no PDF asset.`);
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  const chapterPath = `${ZOO_COLLECTION_PATH}/${slug}`;
  return {
    ...data,
    markdown,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    path: chapterPath,
    pdfPath: `${chapterPath}/pdf`,
    pdfUrl: asset.url,
    pdfSha256: asset.sha256,
  };
}

export const ZOO_CHAPTERS = expected.map(([slug, title], index) => loadChapter(slug, title, index + 1));

export function getZooChapter(slug: string) {
  return ZOO_CHAPTERS.find((chapter) => chapter.slug === slug);
}

export function zooChapterToEditorialPiece(chapter: ZooChapter): EditorialPiece {
  return {
    id: `zoo:${chapter.slug}`,
    kind: 'story',
    title: chapter.title,
    description: chapter.description,
    author: chapter.author,
    canonicalPath: chapter.path,
    pdfPath: chapter.pdfPath,
    section: ZOO_COLLECTION_TITLE,
    image: { src: ZOO_HERO.url, alt: ZOO_HERO.alt },
    pdfOverrideUrl: chapter.pdfUrl,
    blocks: markdownToEditorialBlocks(chapter.markdown),
  };
}
