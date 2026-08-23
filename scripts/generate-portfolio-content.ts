/**
 * Build the checked-in reader data and upload the downloadable PDFs from the
 * validated EPUB/PDF set in writing-archive.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... tsx scripts/generate-portfolio-content.ts
 *
 * Set WRITING_ARCHIVE_ROOT to override the sibling archive location.
 *
 * This is a manual authoring step, not part of `npm run build`. It writes two
 * tracked artifacts — `data/portfolio-content/*.md` (reader bodies) and
 * `data/portfolio-downloads.json` (blob URLs) — so a fresh clone builds without
 * a blob token or a copy of the archive.
 *
 * PDFs go to Vercel Blob at a content-addressed path, mirroring the convention
 * the title images already use. EPUBs are read as the reader-content source and
 * are never uploaded: the PDF is the free edition, the EPUB is the paid tier.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';

const archiveRoot =
  process.env.WRITING_ARCHIVE_ROOT?.trim() ||
  '/Users/arcades/Documents/GitHub/writing-archive';

/** The seven-story collection, built by novels/this-is-what-i-do-for-fun. */
const collection = path.join(archiveRoot, 'novels', 'this-is-what-i-do-for-fun');
/** Everything else still comes from the archive's generic export directory. */
const distPortfolio = path.join(archiveRoot, '_dist', 'portfolio');

type Work = {
  slug: string;
  /** Skip Markdown generation — the work has no linear reading order. */
  noReaderBody?: boolean;
};

const COLLECTION_SLUGS = [
  'carl',
  'parts-of-the-whole',
  'butterfly-exe',
  'our-hope-chest',
  'cleanup-on-pod-six',
  'la-ligne-du-marais',
  'mr-trout-s-slide',
] as const;

const WORKS: readonly Work[] = [
  ...COLLECTION_SLUGS.map((slug) => ({
    slug,
    // Butterfly.exe is a branching Twine gamebook. Its EPUB flattens every
    // passage into one ch001.xhtml, so a generated reader body would be a
    // meaningless linear dump. The detail page links to /toys/butterfly-exe.
    noReaderBody: slug === 'butterfly-exe',
  })),
  // Not part of the collection — an It Takes a Zoo chapter.
  { slug: 'gallery-view' },
];

function isCollectionWork(slug: string): boolean {
  return (COLLECTION_SLUGS as readonly string[]).includes(slug);
}

function sourcePaths(slug: string): { epub: string; pdf: string; cover?: string } {
  if (isCollectionWork(slug)) {
    return {
      epub: path.join(collection, slug, `${slug}.epub`),
      pdf: path.join(collection, slug, `${slug}.pdf`),
      cover: path.join(collection, 'covers', `${slug}.png`),
    };
  }
  // Gallery View's landscape title image is already on blob and hardcoded in
  // lib/portfolio.ts; it has no portrait cover in the collection.
  return {
    epub: path.join(distPortfolio, `${slug}.epub`),
    pdf: path.join(distPortfolio, `${slug}.pdf`),
  };
}

/** 6 × 9in at 275dpi — every cover in the collection is rendered at this size. */
const COVER_WIDTH = 1650;
const COVER_HEIGHT = 2550;

const contentDir = path.join(process.cwd(), 'data', 'portfolio-content');
const downloadsManifest = path.join(process.cwd(), 'data', 'portfolio-downloads.json');
const GALLERY_ARTWORK_MARKER = 'PORTFOLIO_GALLERY_ARTWORK';
const GALLERY_ARTWORK_URL =
  'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/gallery-view-artwork/73b7ab70aac4ecd303a5b8161a2aeb6860bafb44f7a7fa2fa3d52f3a941f3f1b/gallery-view-artwork.png';

type CoverRecord = { url: string; width: number; height: number };
type DownloadRecord = {
  pdf: string;
  sha256: string;
  bytes: number;
  cover?: CoverRecord;
};

function epubBodyToMarkdown(epubPath: string): string {
  const xhtml = execFileSync('unzip', ['-p', epubPath, 'EPUB/text/ch001.xhtml'], {
    encoding: 'utf8',
  });
  const markdown = execFileSync('pandoc', ['-f', 'html', '-t', 'gfm'], {
    input: xhtml,
    encoding: 'utf8',
  });

  return markdown
    .replace(/^<\/?div[^>]*>\s*$/gmu, '')
    .trim()
    .replace(/^# .+\n+\*by Austen Tucker\*\n+/u, '')
    .replace(
      /<figure>\s*<img src="\.\.\/media\/file0\.png" alt="Gallery View"\s*\/>\s*<figcaption[^>]*>Gallery View<\/figcaption>\s*<\/figure>/g,
      GALLERY_ARTWORK_MARKER,
    )
    .replace(/^-{4,}$/gmu, '---')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Upload one PDF at `portfolio/<slug>/<sha256>/<slug>.pdf`.
 *
 * `addRandomSuffix: false` is load-bearing. With the default, Vercel Blob
 * appends a random segment and every run mints a fresh URL for byte-identical
 * content — the script stops being idempotent and previously-published links
 * drift. The sha256 in the path is the version; re-running against an unchanged
 * PDF overwrites the same address with the same bytes.
 */
async function uploadContentAddressed(
  pathname: (sha256: string) => string,
  filePath: string,
  contentType: string,
): Promise<{ url: string; sha256: string; bytes: number }> {
  const bytes = fs.readFileSync(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const { url } = await put(pathname(sha256), bytes, {
    access: 'public',
    addRandomSuffix: false,
    contentType,
  });
  return { url, sha256, bytes: bytes.byteLength };
}

async function uploadWork(slug: string, pdfPath: string, coverPath?: string): Promise<DownloadRecord> {
  const pdf = await uploadContentAddressed(
    (sha) => `portfolio/${slug}/${sha}/${slug}.pdf`,
    pdfPath,
    'application/pdf',
  );
  const record: DownloadRecord = { pdf: pdf.url, sha256: pdf.sha256, bytes: pdf.bytes };

  if (coverPath) {
    if (!fs.existsSync(coverPath)) {
      throw new Error(`Missing cover art for ${slug} at ${coverPath}`);
    }
    const cover = await uploadContentAddressed(
      (sha) => `portfolio/${slug}/${sha}/${slug}-cover.png`,
      coverPath,
      'image/png',
    );
    record.cover = { url: cover.url, width: COVER_WIDTH, height: COVER_HEIGHT };
  }

  return record;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required to upload the PDF editions.');
  }
  fs.mkdirSync(contentDir, { recursive: true });

  const downloads: Record<string, DownloadRecord> = {};
  let readerBodies = 0;

  for (const work of WORKS) {
    const { slug } = work;
    const { epub: epubPath, pdf: pdfPath, cover: coverPath } = sourcePaths(slug);
    if (!fs.existsSync(epubPath) || !fs.existsSync(pdfPath)) {
      throw new Error(`Missing validated artifacts for ${slug} (looked in ${path.dirname(pdfPath)})`);
    }

    downloads[slug] = await uploadWork(slug, pdfPath, coverPath);
    const uploaded = coverPath ? 'PDF + cover' : 'PDF';

    if (work.noReaderBody) {
      console.log(`${slug}: uploaded ${uploaded}, skipped reader body`);
      continue;
    }

    const markdown = epubBodyToMarkdown(epubPath).replace(
      GALLERY_ARTWORK_MARKER,
      `![Gallery View](${GALLERY_ARTWORK_URL})`,
    );
    fs.writeFileSync(
      path.join(contentDir, `${slug}.md`),
      `${markdown}\n`,
    );
    readerBodies += 1;
    console.log(`${slug}: uploaded ${uploaded}, wrote reader body`);
  }

  // Sort so the committed manifest has a stable diff run to run.
  const sorted = Object.fromEntries(
    Object.entries(downloads).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(downloadsManifest, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(
    `\nGenerated ${readerBodies} reader documents and uploaded ${WORKS.length} PDFs.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
