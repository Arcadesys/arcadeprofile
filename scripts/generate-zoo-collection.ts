import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { put } from '@vercel/blob';

const SITE_ROOT = process.cwd();
const WRITING_ROOT = path.resolve(
  process.env.WRITING_ARCHIVE_ROOT || path.join(SITE_ROOT, '..', 'writing-archive'),
);
const ZOO_ROOT = path.join(WRITING_ROOT, 'novels', 'it-takes-a-zoo');
const CONTENT_ROOT = path.join(SITE_ROOT, 'content', 'novels', 'it-takes-a-zoo');
const ASSET_MANIFEST = path.join(SITE_ROOT, 'data', 'zoo-collection-assets.json');
const GALLERY_IMAGE =
  'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/collections/it-takes-a-zoo/gallery-view-artwork/73b7ab70aac4ecd303a5b8161a2aeb6860bafb44f7a7fa2fa3d52f3a941f3f1b/gallery%20view.png';

type ChapterDefinition = {
  title: string;
  slug: string;
  order: number;
  description: string;
  directory: string;
  filename: RegExp;
  pdfPath?: string;
};

const CHAPTERS: ChapterDefinition[] = [
  {
    title: 'Cold Boot',
    slug: 'cold-boot',
    order: 1,
    description: 'Jamie discovers the Zoo, a private full-dive server where nobody asks her to prove she belongs before setting another place at the table.',
    directory: 'ms/2 - Cold Boot',
    filename: /^\d{2} .+\.md$/,
  },
  {
    title: 'Gallery View',
    slug: 'gallery-view',
    order: 2,
    description: 'Geoff, a tiny mouse artist in the Zoo and a delivery worker outside it, risks visibility when his secret art starts opening doors.',
    directory: 'ms/3 - Gallery View/draft',
    filename: /^\d{2} .+\.md$/,
  },
  {
    title: 'Permissions',
    slug: 'permissions',
    order: 3,
    description: "Jack's unpublishable founder confession traces the compromises, trust, war damage, and family decisions that built the Zoo.",
    directory: 'ms/4 - Permissions/draft',
    filename: /^\d{2} - .+\.md$/,
  },
  {
    title: 'Goodgirl.tv',
    slug: 'goodgirl-tv',
    order: 4,
    description: 'Gemini, a lifelong puppygirl influencer bred by audience vote, becomes CancerCancer in the Zoo: an anonymous sim artist whose rooms ask what people think instead of what they look like.',
    directory: 'ms/5 - Goodgirl.tv/draft',
    filename: /^\d{2} - .+\.md$/,
  },
  {
    title: 'Soft Reset',
    slug: 'soft-reset',
    order: 5,
    description: 'Anabelle returns to a simulation of one afternoon four years gone—the last day her family felt whole—and discovers that keeping the save is not the same as keeping the past.',
    directory: 'ms/6 - Soft Reset/draft',
    filename: /^\d{2} - .+\.md$/,
  },
  {
    title: 'Open Port',
    slug: 'open-port',
    order: 6,
    description: 'Jack, Vivian, Nate, and the early Zoo turn a hospital-room hack into illegal architecture and family infrastructure.',
    directory: 'ms/7 - Open Port/draft',
    filename: /^\d{2} - .+\.md$/,
  },
  {
    title: 'Failover',
    slug: 'failover',
    order: 7,
    description: 'Kat and Kit meet a new little at the Zoo’s door as a hidden intervention in their shared memory begins to surface.',
    directory: 'ms/8 - Failover',
    filename: /^Failover\.md$/,
    pdfPath: 'exports/failover/dist/failover.pdf',
  },
];

function stripFrontmatter(text: string) {
  return text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

function stripNotes(text: string) {
  return text
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/<claude>[\s\S]*?<\/claude>\s*/gi, '');
}

function stripDuplicatedPoem(text: string) {
  const poem = text.indexOf('It takes a Zoo to raise a child,');
  if (poem < 0 || poem > 2400) return text;
  const divider = text.indexOf('\n---', poem);
  if (divider < 0) throw new Error('Found the duplicated poem without its closing divider.');
  return text.slice(divider + 4).trimStart();
}

function cleanScene(source: string) {
  let text = stripDuplicatedPoem(stripNotes(stripFrontmatter(source)));
  text = text.replace(/^# (?!#)/m, '## ');
  text = text.replace(
    /!\[Gallery View\]\(\.\.\/gallery%20view\.png\)/g,
    `![A luminous abstract artwork made of layered translucent color and light.](${GALLERY_IMAGE})`,
  );
  return text.trim();
}

function quoteYaml(value: string) {
  return JSON.stringify(value);
}

async function generateMarkdown(chapter: ChapterDefinition) {
  const directory = path.join(ZOO_ROOT, chapter.directory);
  const filenames = (await readdir(directory)).filter((name) => chapter.filename.test(name)).sort();
  if (!filenames.length) throw new Error(`No scenes found for ${chapter.title}.`);
  const scenes = await Promise.all(
    filenames.map(async (filename) => {
      const source = await readFile(path.join(directory, filename), 'utf8');
      return cleanScene(chapter.slug === 'failover' ? source.replace(/^# Failover\s*\n/, '') : source);
    }),
  );
  if (scenes.some((scene) => !scene)) throw new Error(`An empty scene was produced for ${chapter.title}.`);
  const frontmatter = [
    '---',
    `title: ${quoteYaml(chapter.title)}`,
    `slug: ${quoteYaml(chapter.slug)}`,
    `order: ${chapter.order}`,
    'author: "Austen Tucker"',
    `description: ${quoteYaml(chapter.description)}`,
    `source: ${quoteYaml(chapter.slug === 'failover' ? `${chapter.directory}/Failover.md` : chapter.directory)}`,
    '---',
    '',
  ].join('\n');
  const output = `${frontmatter}${scenes.join('\n\n---\n\n')}\n`;
  if (/<!--|<claude>/i.test(output)) throw new Error(`Planning notes survived in ${chapter.title}.`);
  if (/^# (?!#)/m.test(output)) throw new Error(`A page-level H1 survived in ${chapter.title}.`);
  if (output.includes('It takes a Zoo to raise a child,')) throw new Error(`The separate poem survived in ${chapter.title}.`);
  await writeFile(path.join(CONTENT_ROOT, `${chapter.slug}.md`), output, 'utf8');
  console.log(`Generated ${chapter.slug}.md from ${filenames.length} canonical scenes.`);
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function uploadFile(localPath: string, blobName: string, contentType: string) {
  const bytes = await readFile(localPath);
  const digest = sha256(bytes);
  const pathname = `collections/it-takes-a-zoo/${blobName}/${digest}/${path.basename(localPath)}`;
  const blob = await put(pathname, bytes, {
    access: 'public',
    addRandomSuffix: false,
    contentType,
  });
  return { url: blob.url, sha256: digest, bytes: bytes.byteLength };
}

function validatePdf(pdfPath: string, chapter: ChapterDefinition) {
  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const field = (name: string) => new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(info)?.[1]?.trim();
  if (field('Title') !== chapter.title) throw new Error(`${chapter.slug}.pdf has the wrong title.`);
  if (field('Author') && field('Author') !== 'Austen Tucker') throw new Error(`${chapter.slug}.pdf has the wrong author.`);
  if (Number(field('Pages')) < 1) throw new Error(`${chapter.slug}.pdf has no pages.`);
}

async function uploadAssets() {
  const chapters: Record<string, Awaited<ReturnType<typeof uploadFile>>> = {};
  for (const chapter of CHAPTERS) {
    const pdfPath = path.join(ZOO_ROOT, chapter.pdfPath ?? `output/pdf/${chapter.slug}.pdf`);
    validatePdf(pdfPath, chapter);
    chapters[chapter.slug] = await uploadFile(pdfPath, chapter.slug, 'application/pdf');
    console.log(`Uploaded ${chapter.slug}.pdf.`);
  }
  const heroPath = path.join(
    ZOO_ROOT,
    'web-assets',
    'collection-cover',
    'it-takes-a-zoo-collection-cover-v5.png',
  );
  const heroInfo = await stat(heroPath);
  if (!heroInfo.isFile()) throw new Error('The approved collection hero is missing.');
  const hero = {
    ...(await uploadFile(heroPath, 'cover', 'image/png')),
    width: 1650,
    height: 2550,
  };
  const galleryArtwork = await uploadFile(
    path.join(ZOO_ROOT, 'ms', '3 - Gallery View', 'gallery view.png'),
    'gallery-view-artwork',
    'image/png',
  );
  await writeFile(
    ASSET_MANIFEST,
    `${JSON.stringify({ hero, galleryArtwork, chapters }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote ${path.relative(SITE_ROOT, ASSET_MANIFEST)}.`);
}

await mkdir(CONTENT_ROOT, { recursive: true });
const chapterArg = process.argv.indexOf('--chapter');
const selectedSlug = chapterArg >= 0 ? process.argv[chapterArg + 1] : undefined;
if (chapterArg >= 0 && !selectedSlug) throw new Error('--chapter requires a slug.');
const selectedChapters = selectedSlug ? CHAPTERS.filter((chapter) => chapter.slug === selectedSlug) : CHAPTERS;
if (selectedChapters.length === 0) throw new Error(`Unknown Zoo chapter: ${selectedSlug}`);
if (selectedSlug && process.argv.includes('--upload')) throw new Error('Upload a single chapter PDF separately before updating its manifest entry.');
for (const chapter of selectedChapters) await generateMarkdown(chapter);
if (process.argv.includes('--upload')) await uploadAssets();
