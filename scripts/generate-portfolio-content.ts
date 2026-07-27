/**
 * Build the checked-in portfolio reader data and downloadable artifacts from
 * the validated EPUB/PDF set in writing-archive.
 *
 * Usage:
 *   tsx --require ./scripts/patch-next-env.cjs scripts/generate-portfolio-content.ts
 *
 * Set WRITING_ARCHIVE_ROOT to override the sibling archive location.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getEnabledNodes, editorConfigFactory } from '@payloadcms/richtext-lexical';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import {
  $convertFromMarkdownString,
  TRANSFORMERS,
} from '@payloadcms/richtext-lexical/lexical/markdown';
import configPromise from '../payload.config';

const WORKS = [
  'our-hope-chest',
  'cleanup-on-pod-six',
  'mr-trout-s-slide',
  'gallery-view',
  'parts-of-the-whole',
  'la-ligne-du-marais',
] as const;

const archiveRoot =
  process.env.WRITING_ARCHIVE_ROOT?.trim() ||
  '/Users/arcades/Documents/GitHub/writing-archive';
const sourceDir = path.join(archiveRoot, '_dist', 'portfolio');
const contentDir = path.join(process.cwd(), 'data', 'portfolio-content');
const downloadDir = path.join(process.cwd(), 'public', 'portfolio');
const GALLERY_ARTWORK_MARKER = 'PORTFOLIO_GALLERY_ARTWORK';
const GALLERY_ARTWORK_URL =
  'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/gallery-view-artwork/73b7ab70aac4ecd303a5b8161a2aeb6860bafb44f7a7fa2fa3d52f3a941f3f1b/gallery-view-artwork.png';

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

async function main() {
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  const sanitizedConfig = await configPromise;
  const editorConfig = await editorConfigFactory.default({ config: sanitizedConfig });
  const nodes = getEnabledNodes({ editorConfig });

  for (const slug of WORKS) {
    const epubPath = path.join(sourceDir, `${slug}.epub`);
    const pdfPath = path.join(sourceDir, `${slug}.pdf`);
    if (!fs.existsSync(epubPath) || !fs.existsSync(pdfPath)) {
      throw new Error(`Missing validated portfolio artifacts for ${slug}`);
    }

    const markdown = epubBodyToMarkdown(epubPath);
    const editor = createHeadlessEditor({ nodes });
    editor.update(
      () => $convertFromMarkdownString(markdown, TRANSFORMERS),
      { discrete: true },
    );
    const lexical = editor.getEditorState().toJSON() as {
      root: { children: Array<Record<string, unknown>> };
    };

    if (slug === 'gallery-view') {
      const markerIndex = lexical.root.children.findIndex((node) => {
        const children = node.children;
        return Array.isArray(children) &&
          children.length === 1 &&
          (children[0] as { text?: string }).text === GALLERY_ARTWORK_MARKER;
      });
      if (markerIndex === -1) {
        throw new Error('Gallery View artwork marker was not preserved during conversion');
      }
      lexical.root.children[markerIndex] = {
        type: 'upload',
        version: 3,
        format: '',
        id: 'portfolio-gallery-view-artwork',
        fields: { alt: 'Gallery View' },
        relationTo: 'media',
        value: {
          id: 'portfolio-gallery-view-artwork',
          filename: 'gallery-view-artwork.png',
          mimeType: 'image/png',
          url: GALLERY_ARTWORK_URL,
          alt: 'Gallery View',
          width: 1024,
          height: 1536,
          sizes: {},
        },
      };
    }

    fs.writeFileSync(
      path.join(contentDir, `${slug}.json`),
      `${JSON.stringify(lexical, null, 2)}\n`,
    );
    fs.copyFileSync(epubPath, path.join(downloadDir, `${slug}.epub`));
    fs.copyFileSync(pdfPath, path.join(downloadDir, `${slug}.pdf`));
  }

  console.log(`Generated ${WORKS.length} reader documents and ${WORKS.length * 2} downloads.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
