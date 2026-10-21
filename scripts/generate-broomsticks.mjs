/** Manual, local-only edition build. Requires pandoc and Chrome/Chromium.
 * Usage: node scripts/generate-broomsticks.mjs [path-to-chrome] [--epub-only]
 * No provider calls, uploads, email sends or archive writes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const source = path.resolve('data/subscriber-gifts/broomsticks.md');
const output = path.resolve('public/lead-magnets');
const epubOnly = process.argv.includes('--epub-only');
const chrome = process.argv.slice(2).find((arg) => arg !== '--epub-only') || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
if (!chrome && !epubOnly) throw new Error('Pass the installed Chrome/Chromium executable as the first argument.');
const temporary = mkdtempSync(path.join(tmpdir(), 'broomsticks-edition-'));

try {
  mkdirSync(output, { recursive: true });
  // Disable smart punctuation: manuscript words and punctuation are authoritative.
  const story = execFileSync('pandoc', [source, '--from=markdown-smart', '--to=html5'], { encoding: 'utf8' });
  const note = `The opening story of <cite>Estelle's Children</cite>, forthcoming from Free Play Publishing.`;
  const site = '<a href="https://www.thearcades.me/novels/estelles-children">thearcades.me · Estelle’s Children</a>';
  const css = `
    @page { size: 5.5in 8.5in; margin: .65in .6in .7in;
      @bottom-center { content: counter(page); font: 10pt Arial, sans-serif; color: #333; }
    }
    @page:first { @bottom-center { content: none; } }
    html { color: #111; background: #fff; }
    body { margin: 0; font: 16.5pt/1.55 Arial, sans-serif; font-variant-ligatures: none; }
    p { margin: 0 0 1em; orphans: 3; widows: 3; }
    h1, h2 { line-height: 1.15; break-after: avoid; }
    h1 { font-size: 34pt; } h2 { font-size: 26pt; }
    a { color: #111; text-decoration: underline; overflow-wrap: anywhere; }
    .title { break-after: page; padding-top: 1.25in; }
    .author { font-size: 20pt; } .edition { font-size: 14pt; }
    hr { border: 0; border-top: 1px solid #555; margin: 1.5em auto; width: 30%; }
    main > hr:last-child { display: none; }
  `;
  const pdfHtml = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><title>Broomsticks</title><meta name="author" content="Austen Tucker"><style>${css}</style></head><body><section class="title" aria-label="Title page"><h1>Broomsticks</h1><p class="author">Austen Tucker</p><p>${note}</p><p class="edition">Subscriber reading edition</p><p class="edition">${site}</p></section><main>${story}</main></body></html>`;
  if (!epubOnly) execFileSync(chrome, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${path.join(temporary, 'chrome')}`,
    '--no-pdf-header-footer', '--export-tagged-pdf',
    `--print-to-pdf=${path.join(output, 'broomsticks.pdf')}`,
    `data:text/html;base64,${Buffer.from(pdfHtml).toString('base64')}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 });
  const epubBody = path.join(temporary, 'broomsticks.html');
  // An explicit level-one heading prevents Pandoc from inventing a "Broomsticks"
  // wrapper whose generated ID collides with the manuscript's level-two heading.
  writeFileSync(epubBody, `<html lang="en-US"><head><title>Broomsticks</title></head><body><h1 id="about-this-edition">About this edition</h1><section><p>${note}</p><p>Subscriber reading edition · ${site}</p></section>${story}</body></html>`);
  const epubCss = path.join(temporary, 'reading.css');
  writeFileSync(epubCss, 'body { color: #111; background: #fff; font-family: sans-serif; font-size: 1.125em; line-height: 1.6; } p { margin: 0 0 1em; orphans: 3; widows: 3; } h1, h2 { line-height: 1.2; } a { color: inherit; text-decoration: underline; }');
  execFileSync('pandoc', [epubBody, '--from=html', '--to=epub3', '--toc', '--toc-depth=2',
    '--metadata=title:Broomsticks', '--metadata=author:Austen Tucker', '--metadata=lang:en-US',
    '--metadata=publisher:Free Play Publishing', '--metadata=date:2026-10-20',
    '--metadata=description:The opening story of Estelle’s Children, forthcoming from Free Play Publishing. Subscriber reading edition.',
    `--css=${epubCss}`, '--output', path.join(output, 'broomsticks.epub'),
  ]);
  for (const extension of epubOnly ? ['epub'] : ['pdf', 'epub']) {
    const filename = path.join(output, `broomsticks.${extension}`);
    console.log(`${path.relative(process.cwd(), filename)}: ${readFileSync(filename).length} bytes`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
