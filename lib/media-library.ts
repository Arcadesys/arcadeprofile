import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

/**
 * The media library is a repository-owned catalog of every image uploaded to
 * Vercel Blob. Blob holds the bytes; this file holds what a writer needs to
 * reuse them: the stable URL, checksum, dimensions, alt text, and caption.
 * There is no database and no upload route — `npm run upload:image` appends
 * entries here and the catalog is committed like any other content.
 */

export const DEFAULT_MEDIA_LIBRARY_PATH = path.join(process.cwd(), 'content', 'media', 'library.json');
export const BLOB_STORE_HOSTNAME = 'puhixbchomgvn0ti.public.blob.vercel-storage.com';

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const nonEmptyText = z.string().trim().min(1, 'must not be empty');

export const mediaAssetSchema = z
  .object({
    id: z.string().regex(ID_RE, 'must be lowercase kebab-case'),
    url: z.string().url(),
    sha256: z.string().regex(SHA256_RE, 'must be a lowercase hex SHA-256 digest'),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif']),
    byteSize: z.number().int().positive(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    alt: nonEmptyText,
    caption: nonEmptyText.optional(),
    /** Post slug or project the asset was made for; informational only. */
    usedIn: z.array(nonEmptyText).optional(),
    addedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((asset, ctx) => {
    const url = new URL(asset.url);
    if (url.hostname !== BLOB_STORE_HOSTNAME) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: `must be on ${BLOB_STORE_HOSTNAME}` });
    }
    if (url.pathname.startsWith('/images/') && !url.pathname.startsWith(`/images/${asset.sha256}/`)) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'content-addressed path must match sha256' });
    }
  });

export const mediaLibrarySchema = z.object({ assets: z.array(mediaAssetSchema) }).strict();

export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaLibrary = z.infer<typeof mediaLibrarySchema>;

export function parseMediaLibrary(raw: unknown, source = 'media library'): MediaLibrary {
  const parsed = mediaLibrarySchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid ${source}: ${z.prettifyError(parsed.error)}`);

  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const asset of parsed.data.assets) {
    if (ids.has(asset.id)) throw new Error(`Duplicate media id ${asset.id} in ${source}.`);
    if (urls.has(asset.url)) throw new Error(`Duplicate media url ${asset.url} in ${source}.`);
    ids.add(asset.id);
    urls.add(asset.url);
  }
  return parsed.data;
}

export function loadMediaLibrary(filePath: string = DEFAULT_MEDIA_LIBRARY_PATH): MediaLibrary {
  if (!statSync(/* turbopackIgnore: true */ filePath, { throwIfNoEntry: false })?.isFile()) return { assets: [] };
  return parseMediaLibrary(JSON.parse(readFileSync(/* turbopackIgnore: true */ filePath, 'utf8')), filePath);
}

/**
 * Insert or replace by URL. Content-addressed uploads of identical bytes return
 * the same URL, so re-uploading updates metadata instead of duplicating it.
 */
export function upsertMediaAsset(library: MediaLibrary, asset: MediaAsset): MediaLibrary {
  const others = library.assets.filter((existing) => existing.url !== asset.url);
  const clash = others.find((existing) => existing.id === asset.id);
  if (clash) throw new Error(`Media id ${asset.id} already names ${clash.url}; choose another --id.`);
  return parseMediaLibrary({ assets: [...others, asset].sort((a, b) => a.id.localeCompare(b.id)) });
}

export function saveMediaLibrary(library: MediaLibrary, filePath: string = DEFAULT_MEDIA_LIBRARY_PATH): void {
  writeFileSync(filePath, `${JSON.stringify(parseMediaLibrary(library), null, 2)}\n`);
}

/** The figure line `lib/markdown-render.ts` turns into an image with caption. */
export function mediaMarkdown(asset: Pick<MediaAsset, 'alt' | 'url' | 'caption'>): string {
  const alt = asset.alt.replace(/[[\]]/g, '');
  const caption = asset.caption?.replace(/"/g, '”');
  return caption ? `![${alt}](${asset.url} "${caption}")` : `![${alt}](${asset.url})`;
}

export function mediaIdFromFilename(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
