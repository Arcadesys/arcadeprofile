import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { put } from '@vercel/blob';

import { renderZooCompleteEditionPdf } from '@/lib/zoo-complete-edition';

const outputPath = path.join(process.cwd(), 'public', 'editions', 'it-takes-a-zoo-complete.pdf');
const manifestPath = path.join(process.cwd(), 'data', 'zoo-collection-assets.json');
const pdf = await renderZooCompleteEditionPdf();
const sha256 = createHash('sha256').update(pdf).digest('hex');

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, pdf);
const result = {
  output: path.relative(process.cwd(), outputPath),
  sha256,
  bytes: pdf.byteLength,
};

if (process.argv.includes('--upload')) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required for --upload.');
  const blob = await put(
    `collections/it-takes-a-zoo/complete/${sha256}/it-takes-a-zoo-complete.pdf`,
    pdf,
    { access: 'public', addRandomSuffix: false, contentType: 'application/pdf' },
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  manifest.completeEdition = { url: blob.url, sha256, bytes: pdf.byteLength };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  Object.assign(result, { url: blob.url, manifest: path.relative(process.cwd(), manifestPath) });
}

console.log(JSON.stringify(result));
