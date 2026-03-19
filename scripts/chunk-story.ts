#!/usr/bin/env npx ts-node

/**
 * Split a long markdown file into story chapters.
 *
 * Usage:
 *   npx ts-node scripts/chunk-story.ts input.md --slug the-vault
 *   npx ts-node scripts/chunk-story.ts input.md --slug the-vault --title "The Vault"
 *   npx ts-node scripts/chunk-story.ts input.md --slug the-vault --status complete
 */

import fs from 'fs';
import path from 'path';

const MIN_WORDS = 750;
const MAX_WORDS = 4000;

interface Args {
  input: string;
  slug: string;
  title?: string;
  status: 'in-progress' | 'complete';
  date: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const input = args.find(a => !a.startsWith('--'));
  if (!input) {
    console.error('Usage: npx ts-node scripts/chunk-story.ts <input.md> --slug <slug> [--title "Title"] [--status complete] [--date 2026-04-01]');
    process.exit(1);
  }

  const flagIndex = (flag: string) => args.indexOf(flag);
  const flagValue = (flag: string) => {
    const i = flagIndex(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };

  const slug = flagValue('--slug');
  if (!slug) {
    console.error('--slug is required');
    process.exit(1);
  }

  return {
    input,
    slug,
    title: flagValue('--title'),
    status: (flagValue('--status') as 'in-progress' | 'complete') || 'in-progress',
    date: flagValue('--date') || new Date().toISOString().split('T')[0],
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function splitIntoScenes(text: string): string[] {
  // Split on scene breaks: ---, ***, or # Chapter headings
  const parts = text.split(/\n(?:---|\*\*\*|#{1,2}\s+[Cc]hapter\s+\d+[^\n]*)\n/);
  return parts.map(p => p.trim()).filter(Boolean);
}

function chunkScenes(scenes: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const scene of scenes) {
    const sw = wordCount(scene);

    // If adding this scene would exceed max and we already have content, start new chunk
    if (currentWords > 0 && currentWords + sw > MAX_WORDS) {
      // Only start a new chunk if current chunk meets minimum
      if (currentWords >= MIN_WORDS) {
        chunks.push(current);
        current = [scene];
        currentWords = sw;
      } else {
        // Below minimum — keep accumulating even past max
        current.push(scene);
        currentWords += sw;
      }
    } else {
      current.push(scene);
      currentWords += sw;
    }
  }

  if (current.length > 0) {
    // If last chunk is too small and there's a previous chunk, merge with it
    if (currentWords < MIN_WORDS && chunks.length > 0) {
      chunks[chunks.length - 1].push(...current);
    } else {
      chunks.push(current);
    }
  }

  return chunks;
}

function generateChapterTitle(chapterNum: number, content: string): string {
  // Try to extract a heading from the content
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  return `Chapter ${chapterNum}`;
}

function generateExcerpt(content: string): string {
  const stripped = content.replace(/^#{1,6}\s+.*$/gm, '').replace(/[#*_\n]/g, ' ').trim();
  return stripped.slice(0, 150).trim() + '...';
}

function main() {
  const args = parseArgs();
  const inputPath = path.resolve(args.input);

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const scenes = splitIntoScenes(raw);
  const chunks = chunkScenes(scenes);

  const outDir = path.join(process.cwd(), 'content', 'stories', args.slug);
  fs.mkdirSync(outDir, { recursive: true });

  const title = args.title || args.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Write _index.mdx
  const indexContent = `---
title: "${title}"
date: "${args.date}"
excerpt: "${generateExcerpt(raw)}"
coverImage: "/images/stories/${args.slug}-cover.jpg"
status: "${args.status}"
---

${title} — a serialized story.
`;
  fs.writeFileSync(path.join(outDir, '_index.mdx'), indexContent);
  console.log(`Created ${outDir}/_index.mdx`);

  // Write chapter files
  for (let i = 0; i < chunks.length; i++) {
    const chapterNum = i + 1;
    const body = chunks[i].join('\n\n---\n\n');
    const chapterTitle = generateChapterTitle(chapterNum, body);

    const chapterContent = `---
title: "${chapterTitle}"
chapter: ${chapterNum}
date: "${args.date}"
excerpt: "${generateExcerpt(body)}"
---

${body}
`;
    fs.writeFileSync(path.join(outDir, `${chapterNum}.mdx`), chapterContent);
    console.log(`Created ${outDir}/${chapterNum}.mdx (${wordCount(body)} words)`);
  }

  console.log(`\nDone! ${chunks.length} chapters created in ${outDir}`);
  console.log(`Remember to add a cover image at public/images/stories/${args.slug}-cover.jpg`);
}

main();
