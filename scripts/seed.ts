/**
 * One-time seed script: reads all .mdx blog posts and _group.json files,
 * converts them to Payload CMS documents via the local API.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Idempotent — skips posts/groups that already exist (matched by slug).
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getPayload } from 'payload';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import {
  $convertFromMarkdownString,
  TRANSFORMERS,
} from '@payloadcms/richtext-lexical/lexical/markdown';
import {
  getEnabledNodes,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import configPromise from '../payload.config';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const SCHEDULE_PATH = path.join(process.cwd(), 'data', 'schedule.json');

interface ScheduleEntry {
  slug: string;
  status: string;
  scheduledDate: string | null;
  tags: string[];
}

function readSchedule(): { posts: ScheduleEntry[] } {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
  } catch {
    return { posts: [] };
  }
}

async function main() {
  const payload = await getPayload({ config: configPromise });

  // Build editor config to get nodes for the headless editor
  const sanitizedConfig = await payload.config;
  const editorConfig = await editorConfigFactory.default({
    config: sanitizedConfig,
  });
  const nodes = getEnabledNodes({ editorConfig });

  function markdownToLexical(markdown: string): unknown {
    const editor = createHeadlessEditor({ nodes });
    editor.update(
      () => {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      },
      { discrete: true },
    );
    return editor.getEditorState().toJSON();
  }

  const schedule = readSchedule();
  const scheduleMap = new Map(schedule.posts.map((p) => [p.slug, p]));

  // --- Seed groups ---
  console.log('Seeding groups...');
  if (!fs.existsSync(BLOG_DIR)) {
    console.log('No content/blog directory found. Exiting.');
    process.exit(0);
  }

  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const groupSlug = entry.name;
    const metaPath = path.join(BLOG_DIR, groupSlug, '_group.json');

    let title = groupSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    let description: string | undefined;
    let tags: string[] = [];

    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.title) title = meta.title;
        if (meta.description) description = meta.description;
        if (Array.isArray(meta.tags)) tags = meta.tags;
      } catch {
        /* use defaults */
      }
    }

    // Check if group already exists
    const existing = await payload.find({
      collection: 'groups',
      where: { slug: { equals: groupSlug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  Group "${groupSlug}" already exists, skipping.`);
      continue;
    }

    await payload.create({
      collection: 'groups',
      data: {
        title,
        slug: groupSlug,
        description: description ?? '',
        tags: tags.map((t) => ({ tag: t })),
      },
    });
    console.log(`  Created group: ${title} (${groupSlug})`);
  }

  // --- Seed posts ---
  console.log('\nSeeding posts...');

  const mdxFiles: {
    slug: string;
    filePath: string;
    group?: string;
  }[] = [];

  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      mdxFiles.push({
        slug: entry.name.replace('.mdx', ''),
        filePath: path.join(BLOG_DIR, entry.name),
      });
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const groupDir = path.join(BLOG_DIR, entry.name);
      for (const file of fs.readdirSync(groupDir)) {
        if (file.endsWith('.mdx')) {
          mdxFiles.push({
            slug: file.replace('.mdx', ''),
            filePath: path.join(groupDir, file),
            group: entry.name,
          });
        }
      }
    }
  }

  for (const { slug, filePath, group } of mdxFiles) {
    // Check if post already exists
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  Post "${slug}" already exists, skipping.`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content: markdownBody } = matter(raw);

    const title = (data.title as string) || slug;
    const date = (data.date as string) || new Date().toISOString().slice(0, 10);
    const excerpt =
      (data.excerpt as string) ||
      markdownBody
        .slice(0, 200)
        .replace(/[#*_\n]/g, ' ')
        .trim() + '...';
    const order =
      typeof data.order === 'number' ? data.order : undefined;
    const newsletterHeading =
      typeof data.newsletterHeading === 'string'
        ? data.newsletterHeading
        : undefined;
    const newsletterDescription =
      typeof data.newsletterDescription === 'string'
        ? data.newsletterDescription
        : undefined;

    // Determine status from schedule.json
    const scheduleEntry = scheduleMap.get(slug);
    let status: string = 'draft';
    let scheduledPublishDate: string | undefined;
    if (scheduleEntry) {
      status = scheduleEntry.status === 'sent' ? 'sent' : scheduleEntry.status;
      if (scheduleEntry.scheduledDate) {
        scheduledPublishDate = scheduleEntry.scheduledDate;
      }
    }

    // Merge tags from schedule.json
    const scheduleTags = scheduleEntry?.tags ?? [];
    const allTags = [...new Set(scheduleTags)];

    // Convert markdown to Lexical JSON
    const lexicalContent = markdownToLexical(markdownBody);

    await payload.create({
      collection: 'posts',
      data: {
        title,
        slug,
        excerpt,
        content: lexicalContent,
        publishedDate: date,
        status,
        scheduledPublishDate,
        group: group ?? '',
        order,
        author: 'Austen Tucker',
        tags: allTags.map((t) => ({ tag: t })),
        newsletterHeading,
        newsletterDescription,
      },
    });
    console.log(`  Created post: "${title}" (${slug}) [${status}]`);
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
