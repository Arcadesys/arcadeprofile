/**
 * Upload one image to Vercel Blob and print its public URL.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... npm run upload:image -- <path> [--alt "<text>"]
 *
 * This is a manual authoring step for post heroes and in-body images. The site
 * has no upload route and no media collection: a blob URL pasted into a post's
 * frontmatter or body Markdown is the whole mechanism.
 *
 * Uploads are content-addressed with `addRandomSuffix: false`, mirroring
 * `generate-portfolio-content.ts` — re-uploading identical bytes overwrites the
 * same address instead of minting a fresh URL and drifting published links.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';

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
}

function parseArgs(argv: string[]): Options {
  let filePath: string | undefined;
  let alt: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--alt') alt = argv[++index];
    else if (!filePath) filePath = arg;
  }
  if (!filePath) {
    throw new Error('Usage: npm run upload:image -- <path> [--alt "<text>"]');
  }
  return { filePath: path.resolve(filePath), alt };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

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

  console.log(url);
  console.log();
  console.log(`![${alt}](${url})`);
  console.log();
  console.log('hero:');
  console.log(`  src: '${url}'`);
  console.log(`  alt: '${alt.replace(/'/g, "''")}'`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
