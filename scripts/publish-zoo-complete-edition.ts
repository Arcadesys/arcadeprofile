import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { put } from '@vercel/blob';

import {
  sha256,
  validateHeinleinReleaseManifest,
  validateHeinleinZooPdf,
} from '@/lib/zoo-complete-edition-publisher';

type PublishOptions = {
  pdfPath: string;
  sourceManifestPath: string;
  upload: boolean;
};

const SITE_ROOT = process.cwd();
const OUTPUT_PATH = path.join(SITE_ROOT, 'public', 'editions', 'it-takes-a-zoo-complete.pdf');
const ASSET_MANIFEST_PATH = path.join(SITE_ROOT, 'data', 'zoo-collection-assets.json');

function parseOptions(args: string[]): PublishOptions {
  let pdfPath: string | undefined;
  let sourceManifestPath: string | undefined;
  let upload = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--upload') {
      upload = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a path.`);
    if (argument === '--pdf') pdfPath = value;
    else if (argument === '--source-manifest') sourceManifestPath = value;
    else throw new Error(`Unknown argument: ${argument}`);
    index += 1;
  }
  if (!pdfPath || !sourceManifestPath) {
    throw new Error('Usage: npm run publish:zoo-complete-edition -- --pdf /absolute/edition.pdf --source-manifest /absolute/release-manifest.json [--upload]');
  }
  return { pdfPath: path.resolve(pdfPath), sourceManifestPath: path.resolve(sourceManifestPath), upload };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const [pdf, sourceManifestBytes] = await Promise.all([readFile(options.pdfPath), readFile(options.sourceManifestPath, 'utf8')]);
  let sourceManifestJson: unknown;
  try {
    sourceManifestJson = JSON.parse(sourceManifestBytes);
  } catch {
    throw new Error(`Source manifest is not valid JSON: ${options.sourceManifestPath}`);
  }
  const release = validateHeinleinReleaseManifest(sourceManifestJson);
  await validateHeinleinZooPdf(options.pdfPath, release);

  const digest = sha256(pdf);
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, pdf);
  const result: Record<string, string | number | boolean> = {
    output: path.relative(SITE_ROOT, OUTPUT_PATH),
    sha256: digest,
    bytes: pdf.byteLength,
    generator: release.generator,
    generatorVersion: release.generatorVersion,
    sourceSha256: release.sourceSha256,
    uploaded: false,
  };

  if (options.upload) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required for --upload.');
    const blob = await put(
      `collections/it-takes-a-zoo/complete/${digest}/it-takes-a-zoo-complete.pdf`,
      pdf,
      { access: 'public', addRandomSuffix: false, contentType: 'application/pdf' },
    );
    const assets = JSON.parse(await readFile(ASSET_MANIFEST_PATH, 'utf8')) as Record<string, unknown>;
    assets.completeEdition = {
      url: blob.url,
      sha256: digest,
      bytes: pdf.byteLength,
      generator: release.generator,
      generatorVersion: release.generatorVersion,
      sourceSha256: release.sourceSha256,
    };
    await writeFile(ASSET_MANIFEST_PATH, `${JSON.stringify(assets, null, 2)}\n`, 'utf8');
    Object.assign(result, { url: blob.url, manifest: path.relative(SITE_ROOT, ASSET_MANIFEST_PATH), uploaded: true });
  }

  console.log(JSON.stringify(result));
}

await main();
