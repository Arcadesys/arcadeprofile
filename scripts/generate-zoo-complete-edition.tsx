import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { renderZooCompleteEditionPdf } from '@/lib/zoo-complete-edition';

const outputPath = path.join(process.cwd(), 'public', 'editions', 'it-takes-a-zoo-complete.pdf');
const pdf = await renderZooCompleteEditionPdf();

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, pdf);
console.log(JSON.stringify({
  output: path.relative(process.cwd(), outputPath),
  sha256: createHash('sha256').update(pdf).digest('hex'),
  bytes: pdf.byteLength,
}));
