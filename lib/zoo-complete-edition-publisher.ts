import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

import { ZOO_CHAPTERS, ZOO_COLLECTION_TITLE } from '@/lib/zoo-collection';

const execFile = promisify(execFileCallback);

export const HEINLEIN_GENERATOR = 'Heinlein';

export type ZooReleaseChapter = {
  order: number;
  slug: string;
  title: string;
};

export type HeinleinZooReleaseManifest = {
  title: string;
  author: string;
  generator: typeof HEINLEIN_GENERATOR;
  generatorVersion: string;
  sourceSha256: string;
  chapters: ZooReleaseChapter[];
};

type PdfInfo = {
  title: string;
  author: string;
  creator: string;
  producer: string;
  pageSize: string;
  encrypted: string;
};

const EXPECTED_CHAPTERS: ZooReleaseChapter[] = ZOO_CHAPTERS.map(({ order, slug, title }) => ({ order, slug, title }));

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Release manifest ${key} must be a non-empty string.`);
  return value.trim();
}

export function validateHeinleinReleaseManifest(value: unknown): HeinleinZooReleaseManifest {
  const manifest = asRecord(value, 'Release manifest');
  const title = requiredString(manifest, 'title');
  const author = requiredString(manifest, 'author');
  const generator = requiredString(manifest, 'generator');
  const generatorVersion = requiredString(manifest, 'generatorVersion');
  const sourceSha256 = requiredString(manifest, 'sourceSha256');
  if (title !== ZOO_COLLECTION_TITLE) throw new Error(`Release manifest title must be ${JSON.stringify(ZOO_COLLECTION_TITLE)}.`);
  if (author !== 'Austen Tucker') throw new Error('Release manifest author must be "Austen Tucker".');
  if (generator !== HEINLEIN_GENERATOR) throw new Error(`Release manifest generator must be ${HEINLEIN_GENERATOR}.`);
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) throw new Error('Release manifest sourceSha256 must be a lowercase SHA-256 hex digest.');

  if (!Array.isArray(manifest.chapters)) throw new Error('Release manifest chapters must be an array.');
  const chapters = manifest.chapters.map((chapter, index) => {
    const record = asRecord(chapter, `Release manifest chapter ${index + 1}`);
    const order = record.order;
    if (typeof order !== 'number' || !Number.isInteger(order)) throw new Error(`Release manifest chapter ${index + 1} order must be an integer.`);
    return { order, slug: requiredString(record, 'slug'), title: requiredString(record, 'title') };
  });
  if (JSON.stringify(chapters) !== JSON.stringify(EXPECTED_CHAPTERS)) {
    throw new Error('Release manifest chapters must be the six approved Zoo chapters in canonical order.');
  }
  return { title, author, generator: HEINLEIN_GENERATOR, generatorVersion, sourceSha256, chapters };
}

function pdfInfoField(info: string, field: string): string {
  const value = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(info)?.[1]?.trim();
  if (!value) throw new Error(`pdfinfo did not report ${field}.`);
  return value;
}

function normalisePdfText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US');
}

function assertChapterOrder(pdfText: string, chapters: ZooReleaseChapter[]) {
  const text = normalisePdfText(pdfText);
  let cursor = 0;
  for (const chapter of chapters) {
    const title = normalisePdfText(chapter.title);
    const index = text.indexOf(title, cursor);
    if (index < 0) throw new Error(`PDF text is missing ${JSON.stringify(chapter.title)} in canonical order.`);
    cursor = index + title.length;
  }
  if (text.includes('it takes a zoo to raise a child, with a heart so pure and character mild.')) {
    throw new Error('PDF includes the separate opening poem.');
  }
}

async function inspectPdf(pdfPath: string): Promise<{ info: PdfInfo; text: string }> {
  const [{ stdout: info }, { stdout: text }] = await Promise.all([
    execFile('pdfinfo', [pdfPath], { encoding: 'utf8' }),
    execFile('pdftotext', [pdfPath, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
  ]);
  const fields = {
    title: pdfInfoField(info, 'Title'),
    author: pdfInfoField(info, 'Author'),
    creator: pdfInfoField(info, 'Creator'),
    producer: pdfInfoField(info, 'Producer'),
    pageSize: pdfInfoField(info, 'Page size'),
    encrypted: pdfInfoField(info, 'Encrypted'),
  };
  return { info: fields, text };
}

export async function validateHeinleinZooPdf(pdfPath: string, release: HeinleinZooReleaseManifest) {
  const { info, text } = await inspectPdf(pdfPath);
  const expectedGenerator = `${release.generator} ${release.generatorVersion}`;
  if (info.title !== release.title) throw new Error(`PDF title must be ${JSON.stringify(release.title)}.`);
  if (info.author !== release.author) throw new Error(`PDF author must be ${JSON.stringify(release.author)}.`);
  if (info.creator !== expectedGenerator) throw new Error(`PDF Creator must be ${JSON.stringify(expectedGenerator)}.`);
  if (info.producer !== expectedGenerator) throw new Error(`PDF Producer must be ${JSON.stringify(expectedGenerator)}.`);
  if (!/^612 x 792 pts \(letter\)$/i.test(info.pageSize)) throw new Error(`PDF page size must be Letter; received ${JSON.stringify(info.pageSize)}.`);
  if (info.encrypted !== 'no') throw new Error('PDF must not be encrypted.');
  assertChapterOrder(text, release.chapters);
}

export function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
