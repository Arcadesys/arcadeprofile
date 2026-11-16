import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'chat-app');
const sourceDir = path.join(root, 'public', 'reaction-stickers');
const assets = JSON.parse(await readFile(path.join(root, 'data', 'reaction-stickers-assets.json'), 'utf8'));
const robotUrl = assets['assets/robot-reference.png']?.url;
if (!robotUrl?.startsWith('https://')) throw new Error('Robot reference URL is missing from the asset manifest.');

const bundle = await build({
  entryPoints: [path.join(appDir, 'widget.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  write: false,
});
const html = await readFile(path.join(appDir, 'widget.html'), 'utf8');
const workflow = await readFile(path.join(sourceDir, 'workflow.js'), 'utf8');
const prompt = await readFile(path.join(sourceDir, 'prompt.js'), 'utf8');
const inline = [workflow, prompt, bundle.outputFiles[0].text]
  .map(script => `<script>${script.replaceAll('</script', '<\\/script')}</script>`)
  .join('\n');
const output = html.replace('__ROBOT_URL__', () => robotUrl).replace('<!-- INLINE_SCRIPTS -->', () => inline);
if (output === html || output.includes('__ROBOT_URL__')) throw new Error('Widget template markers were not replaced.');
await mkdir(path.join(appDir, 'dist'), { recursive: true });
await writeFile(path.join(appDir, 'dist', 'widget.html'), output);
console.log('Built Reaction Stickers chat widget.');
