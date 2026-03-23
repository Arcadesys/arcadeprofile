#!/usr/bin/env npx ts-node

/**
 * Read the content manifest and convert "publish" entries to MDX blog posts or stories.
 *
 * Usage:
 *   npx ts-node scripts/migrate-from-manifest.ts                  # dry run
 *   npx ts-node scripts/migrate-from-manifest.ts --write          # actually write files
 *   npx ts-node scripts/migrate-from-manifest.ts --manifest path  # custom manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const DEFAULT_MANIFEST = path.join(CONTENT_DIR, 'manifest.json');

const STORY_WORD_THRESHOLD = 3000;

interface ManifestEntry {
  source: string;
  decision: 'triage' | 'publish' | 'skip' | 'revise';
  type: 'blog' | 'story' | 'essay-series' | 'interactive' | 'unknown';
  targetSlug: string;
  wordCount: number;
  firstLine: string;
  category: string;
  notes: string;
  // Optional overrides the user can set
  title?: string;
  date?: string;
  series?: string;
  seriesPart?: number;
  excerpt?: string;
}

function stripFrontmatter(text: string): string {
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end > 0) return text.slice(end + 3).trim();
  }
  return text.trim();
}

function extractTitle(text: string, filename: string): string {
  // Try first heading
  const match = text.match(/^#{1,2}\s+(.+)$/m);
  if (match) return match[1].trim();
  // Fall back to filename
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function generateExcerpt(text: string): string {
  const stripped = stripFrontmatter(text)
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/[#*_\[\]]/g, '')
    .trim();
  const firstParagraph = stripped.split(/\n\n/)[0] || stripped;
  const clean = firstParagraph.replace(/\n/g, ' ').trim();
  if (clean.length <= 160) return clean;
  return clean.slice(0, 157).trim() + '...';
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ensureUniqueSlug(slug: string, existingSlugs: Set<string>): string {
  let candidate = slug;
  let i = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${slug}-${i}`;
    i++;
  }
  existingSlugs.add(candidate);
  return candidate;
}

function buildBlogMdx(entry: ManifestEntry, body: string): string {
  const title = entry.title || extractTitle(body, path.basename(entry.source));
  const excerpt = entry.excerpt || generateExcerpt(body);
  const date = entry.date || new Date().toISOString().split('T')[0];
  const content = stripFrontmatter(body);

  let frontmatter = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: "${date}"\nexcerpt: "${excerpt.replace(/"/g, '\\"')}"`;
  if (entry.series) {
    frontmatter += `\nseries: "${entry.series}"`;
    if (entry.seriesPart) frontmatter += `\nseriesPart: ${entry.seriesPart}`;
  }
  frontmatter += '\n---';

  return `${frontmatter}\n\n${content}\n`;
}

function migrateBlogPost(entry: ManifestEntry, body: string, dryRun: boolean, slugs: Set<string>): string {
  const slug = ensureUniqueSlug(entry.targetSlug, slugs);
  const outPath = path.join(CONTENT_DIR, 'blog', `${slug}.mdx`);

  if (fs.existsSync(outPath)) {
    return `  SKIP (exists): ${outPath}`;
  }

  const mdx = buildBlogMdx(entry, body);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, mdx);
  }

  return `  ${dryRun ? 'WOULD CREATE' : 'CREATED'}: ${outPath} (${wordCount(body)} words)`;
}

function migrateStory(entry: ManifestEntry, body: string, dryRun: boolean, slugs: Set<string>): string {
  const slug = ensureUniqueSlug(entry.targetSlug, slugs);

  // For short stories, just make a blog post with story framing
  if (wordCount(body) < STORY_WORD_THRESHOLD) {
    return migrateBlogPost({ ...entry, targetSlug: slug }, body, dryRun, slugs);
  }

  // For longer stories, use chunk-story approach
  const outDir = path.join(CONTENT_DIR, 'stories', slug);
  if (fs.existsSync(outDir)) {
    return `  SKIP (exists): ${outDir}`;
  }

  const title = entry.title || extractTitle(body, path.basename(entry.source));
  const date = entry.date || new Date().toISOString().split('T')[0];

  if (!dryRun) {
    // Write a single-file story; user can run chunk-story.ts later for splitting
    fs.mkdirSync(outDir, { recursive: true });
    const indexContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: "${date}"\nexcerpt: "${generateExcerpt(body).replace(/"/g, '\\"')}"\nstatus: "complete"\n---\n\n${title} — a story.\n`;
    fs.writeFileSync(path.join(outDir, '_index.mdx'), indexContent);

    const chapterContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\nchapter: 1\ndate: "${date}"\nexcerpt: "${generateExcerpt(body).replace(/"/g, '\\"')}"\n---\n\n${stripFrontmatter(body)}\n`;
    fs.writeFileSync(path.join(outDir, '1.mdx'), chapterContent);
  }

  return `  ${dryRun ? 'WOULD CREATE' : 'CREATED'}: ${outDir}/ (${wordCount(body)} words, story)`;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--write');
  const manifestFlag = args.indexOf('--manifest');
  const manifestPath = manifestFlag >= 0 && args[manifestFlag + 1]
    ? path.resolve(args[manifestFlag + 1])
    : DEFAULT_MANIFEST;

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    console.error('Run generate-manifest.ts first.');
    process.exit(1);
  }

  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const toPublish = manifest.filter(e => e.decision === 'publish');

  if (toPublish.length === 0) {
    console.log('No entries with decision "publish" found in manifest.');
    console.log('Edit the manifest to mark entries for publishing.');
    process.exit(0);
  }

  console.log(`${dryRun ? 'DRY RUN — ' : ''}Processing ${toPublish.length} entries marked "publish":\n`);

  // Track existing slugs to avoid collisions
  const existingSlugs = new Set<string>();
  const blogDir = path.join(CONTENT_DIR, 'blog');
  if (fs.existsSync(blogDir)) {
    for (const f of fs.readdirSync(blogDir)) {
      if (f.endsWith('.mdx')) existingSlugs.add(f.replace('.mdx', ''));
    }
  }
  const storiesDir = path.join(CONTENT_DIR, 'stories');
  if (fs.existsSync(storiesDir)) {
    for (const d of fs.readdirSync(storiesDir)) {
      existingSlugs.add(d);
    }
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of toPublish) {
    const sourcePath = path.join(REPO_ROOT, entry.source);
    if (!fs.existsSync(sourcePath)) {
      console.log(`  ERROR (not found): ${entry.source}`);
      errors++;
      continue;
    }

    let body: string;
    try {
      body = fs.readFileSync(sourcePath, 'utf8');
    } catch {
      console.log(`  ERROR (unreadable): ${entry.source}`);
      errors++;
      continue;
    }

    let result: string;
    switch (entry.type) {
      case 'story':
        result = migrateStory(entry, body, dryRun, existingSlugs);
        break;
      case 'blog':
      case 'essay-series':
      case 'interactive':
      case 'unknown':
      default:
        result = migrateBlogPost(entry, body, dryRun, existingSlugs);
        break;
    }

    console.log(result);
    if (result.includes('SKIP')) skipped++;
    else created++;
  }

  console.log(`\n${dryRun ? 'Would create' : 'Created'}: ${created} | Skipped: ${skipped} | Errors: ${errors}`);
  if (dryRun) {
    console.log('\nThis was a dry run. Use --write to actually create files.');
  }
}

main();
