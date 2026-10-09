/**
 * Upload one image to Vercel Blob, record it in the media library, and print
 * Markdown ready to paste.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... npm run upload:image -- <path> --alt "<text>"
 *     [--caption "<text>"] [--id <kebab-id>] [--used-in <post-slug>]
 *
 * This is a manual authoring step for post heroes and in-body images. The site
 * has no upload route: Blob holds the bytes, and content/media/library.json
 * (see lib/media-library.ts) is the committed catalog of what was uploaded.
 *
 * Uploads are content-addressed with `addRandomSuffix: false`, mirroring
 * `generate-portfolio-content.ts` — re-uploading identical bytes overwrites the
 * same address instead of minting a fresh URL and drifting published links.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';
import sharp from 'sharp';

import {
  loadMediaLibrary,
  mediaIdFromFilename,
  mediaMarkdown,
  saveMediaLibrary,
  upsertMediaAsset,
  type MediaAsset,
} from '../lib/media-library';

/**
 * Explicit MIME types. Blob does not infer reliably from the extension, and a
 * fallback of application/octet-stream makes the image undisplayable.
 */
const CONTENT_TYPES = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.avif', 'image/avif'],
]);

interface Options {
  filePath: string;
  alt?: string;
  caption?: string;
  id?: string;
  usedIn?: string;
}

function parseArgs(argv: string[]): Options {
  let filePath: string | undefined;
  const options: Omit<Options, 'filePath'> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--alt') options.alt = argv[++index];
    else if (arg === '--caption') options.caption = argv[++index];
    else if (arg === '--id') options.id = argv[++index];
    else if (arg === '--used-in') options.usedIn = argv[++index];
    else if (!filePath) filePath = arg;
  }
  if (!filePath) {
    throw new Error('Usage: npm run upload:image -- <path> --alt "<text>" [--caption "<text>"] [--id <id>] [--used-in <slug>]');
  }
  return { filePath: path.resolve(filePath), ...options };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  // Validate the catalog before spending an upload on a run that cannot record it.
  const library = loadMediaLibrary();

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required. See .env.example.');
  }
  if (!fs.existsSync(options.filePath)) {
    throw new Error(`No such file: ${options.filePath}`);
  }

  const extension = path.extname(options.filePath).toLowerCase();
  const contentType = CONTENT_TYPES.get(extension);
  if (!contentType) {
    const known = [...CONTENT_TYPES.keys()].join(', ');
    throw new Error(`Unsupported image extension ${extension}. Expected one of: ${known}`);
  }

  const bytes = fs.readFileSync(options.filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const name = path.basename(options.filePath);
  const { url } = await put(`images/${sha256}/${name}`, bytes, {
    access: 'public',
    addRandomSuffix: false,
    contentType,
  });

  // Alt text is not optional downstream: the frontmatter schema requires
  // hero.alt whenever hero is present, and lib/markdown-render.ts only
  // converts ![alt](url) when the alt is non-empty.
  const alt = options.alt?.trim() || 'TODO: describe this image';
  const existing = library.assets.find((asset) => asset.url === url);
  const { width, height } = await sharp(bytes).metadata().catch(() => ({ width: undefined, height: undefined }));
  const caption = options.caption?.trim() || existing?.caption;
  const usedIn = [...new Set([...(existing?.usedIn ?? []), ...(options.usedIn ? [options.usedIn] : [])])].sort();
  const asset: MediaAsset = {
    id: options.id ?? existing?.id ?? mediaIdFromFilename(name),
    url,
    sha256,
    mimeType: contentType as MediaAsset['mimeType'],
    byteSize: bytes.length,
    ...(width && height ? { width, height } : {}),
    alt,
    ...(caption ? { caption } : {}),
    ...(usedIn.length ? { usedIn } : {}),
    addedAt: existing?.addedAt ?? new Date().toISOString(),
  };
  saveMediaLibrary(upsertMediaAsset(library, asset));

  console.log(url);
  console.log();
  console.log(`Recorded as "${asset.id}" in content/media/library.json`);
  console.log();
  console.log(mediaMarkdown(asset));
  console.log();
  console.log('hero:');
  console.log(`  src: '${url}'`);
  console.log(`  alt: '${alt.replace(/'/g, "''")}'`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
