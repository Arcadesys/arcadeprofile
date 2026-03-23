#!/usr/bin/env npx ts-node

/**
 * Scan source content directories and generate a triage manifest.
 *
 * Usage:
 *   npx ts-node scripts/generate-manifest.ts
 *   npx ts-node scripts/generate-manifest.ts --out content/manifest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT = path.join(__dirname, '..', 'content', 'manifest.json');

const SOURCE_DIRS = [
  'Writing archive',
  'Toonpunk zine',
  'Microgames',
];

const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt', '.mdx']);
const SKIP_EXTENSIONS = new Set(['.docx', '.png', '.jpg', '.jpeg', '.gif']);

interface ManifestEntry {
  source: string;
  decision: 'triage' | 'publish' | 'skip' | 'revise';
  type: 'blog' | 'story' | 'essay-series' | 'interactive' | 'unknown';
  targetSlug: string;
  wordCount: number;
  firstLine: string;
  category: string;
  notes: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function firstContentLine(text: string): string {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('---')) continue;
    // Strip markdown formatting for preview
    const clean = trimmed.replace(/[*_#\[\]]/g, '').trim();
    if (clean.length > 0) return clean.slice(0, 120);
  }
  return '(empty)';
}

function detectCategory(relativePath: string): string {
  const parts = relativePath.split(path.sep);
  if (parts[0] === 'Microgames') return 'microgame';
  if (parts[0] === 'Toonpunk zine') return 'toonpunk';
  if (parts[0] === 'Writing archive' && parts.length <= 2) return 'writing-archive-root';
  if (parts.length < 2) return 'root';
  // Use the first subfolder under Writing archive
  return parts[1].toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function guessType(relativePath: string, category: string): ManifestEntry['type'] {
  if (category === 'microgame') return 'interactive';
  if (category === 'toonpunk') return 'blog';
  if (category === 'did-memoirs-and-stuff') return 'blog';
  if (category === 'short-stories' || category === 'finished-shorts') return 'story';
  if (category === 'finished---catsia-bell') return 'story';
  if (relativePath.includes('essay') || relativePath.includes('pride')) return 'essay-series';
  return 'unknown';
}

function scanDir(baseDir: string, results: ManifestEntry[]): void {
  if (!fs.existsSync(baseDir)) return;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, results);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) continue;
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    const relativePath = path.relative(REPO_ROOT, fullPath);
    const category = detectCategory(relativePath);

    let text = '';
    let wc = 0;
    let first = '(unreadable)';
    try {
      text = fs.readFileSync(fullPath, 'utf8');
      wc = wordCount(text);
      first = firstContentLine(text);
    } catch {
      // skip unreadable files
    }

    results.push({
      source: relativePath,
      decision: 'triage',
      type: guessType(relativePath, category),
      targetSlug: slugify(entry.name),
      wordCount: wc,
      firstLine: first,
      category,
      notes: '',
    });
  }
}

function main() {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf('--out');
  const outPath = outFlag >= 0 && args[outFlag + 1]
    ? path.resolve(args[outFlag + 1])
    : DEFAULT_OUT;

  const results: ManifestEntry[] = [];
  for (const dir of SOURCE_DIRS) {
    scanDir(path.join(REPO_ROOT, dir), results);
  }

  // Sort by category then source path
  results.sort((a, b) => a.category.localeCompare(b.category) || a.source.localeCompare(b.source));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + '\n');

  // Summary
  const categories = new Map<string, number>();
  for (const r of results) {
    categories.set(r.category, (categories.get(r.category) || 0) + 1);
  }

  console.log(`\nManifest generated: ${outPath}`);
  console.log(`Total files: ${results.length}\n`);
  console.log('By category:');
  const sorted = Array.from(categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [cat, count] of sorted) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`\nAll entries start as "triage". Edit the manifest to set decisions to "publish", "skip", or "revise".`);
}

main();
