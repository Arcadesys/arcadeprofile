/**
 * One-time seed script: seeds blog posts/groups from MDX files, then seeds
 * books, projects, and demos from static data files.
 *
 * Usage: npm run seed
 * (uses patch-next-env.cjs preload to fix CJS/ESM interop)
 *
 * Idempotent — skips documents that already exist (matched by slug/key/title).
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

  // --- Seed blog groups ---
  if (fs.existsSync(BLOG_DIR)) {
    const schedule = readSchedule();
    const scheduleMap = new Map(schedule.posts.map((p) => [p.slug, p]));

    console.log('Seeding groups...');
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

    // --- Seed blog posts ---
    console.log('\nSeeding posts...');

    const mdxFiles: { slug: string; filePath: string; group?: string }[] = [];

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
      const order = typeof data.order === 'number' ? data.order : undefined;
      const newsletterHeading =
        typeof data.newsletterHeading === 'string' ? data.newsletterHeading : undefined;
      const newsletterDescription =
        typeof data.newsletterDescription === 'string'
          ? data.newsletterDescription
          : undefined;

      const scheduleEntry = scheduleMap.get(slug);
      let publishStatus: 'draft' | 'scheduled' | 'published' | 'sent' = 'draft';
      let scheduledPublishDate: string | undefined;
      if (scheduleEntry) {
        publishStatus = (scheduleEntry.status === 'sent' ? 'sent' : scheduleEntry.status) as typeof publishStatus;
        if (scheduleEntry.scheduledDate) {
          scheduledPublishDate = scheduleEntry.scheduledDate;
        }
      }

      const scheduleTags = scheduleEntry?.tags ?? [];
      const allTags = [...new Set(scheduleTags)];
      const lexicalContent = markdownToLexical(markdownBody);

      await payload.create({
        collection: 'posts',
        data: {
          title,
          slug,
          excerpt,
          content: lexicalContent as any,
          publishedDate: date,
          publishStatus,
          scheduledPublishDate,
          group: group ?? '',
          order,
          author: 'Austen Tucker',
          tags: allTags.map((t) => ({ tag: t })),
          newsletterHeading,
          newsletterDescription,
        },
      });
      console.log(`  Created post: "${title}" (${slug}) [${publishStatus}]`);
    }
  } else {
    console.log('No content/blog directory found, skipping blog seed.');
  }

  // --- Seed books ---
  console.log('\n--- Seeding Books ---');
  const { books } = await import('../data/books');

  for (const [key, book] of Object.entries(books)) {
    const existing = await payload.find({
      collection: 'books',
      where: { key: { equals: key } },
    });

    if (existing.docs.length > 0) {
      console.log(`  [skip] ${key} (already exists)`);
      continue;
    }

    await payload.create({
      collection: 'books',
      data: {
        key,
        title: book.title,
        description: book.description,
        coverImage: book.coverImage || null,
        buyLink: book.buyLink || null,
        hasBuyButton: book.hasBuyButton ?? false,
        hasPreview: book.hasPreview ?? false,
      },
    });
    console.log(`  [created] ${key}`);
  }

  // --- Seed projects ---
  console.log('\n--- Seeding Projects ---');
  const { projects } = await import('../data/projects');

  for (const project of projects) {
    const existing = await payload.find({
      collection: 'projects',
      where: { title: { equals: project.title } },
    });

    if (existing.docs.length > 0) {
      console.log(`  [skip] ${project.title} (already exists)`);
      continue;
    }

    await payload.create({
      collection: 'projects',
      data: {
        title: project.title,
        description: project.description,
        image: project.image || null,
        href: project.href,
        external: project.external ?? false,
        tags: project.tags || [],
      },
    });
    console.log(`  [created] ${project.title}`);
  }

  // --- Seed demos ---
  console.log('\n--- Seeding Demos ---');
  const { demos } = await import('../data/demos');

  for (const demo of demos) {
    const existing = await payload.find({
      collection: 'demos',
      where: { slug: { equals: demo.slug } },
    });

    if (existing.docs.length > 0) {
      console.log(`  [skip] ${demo.slug} (already exists)`);
      continue;
    }

    await payload.create({
      collection: 'demos',
      data: {
        slug: demo.slug,
        title: demo.title,
        description: demo.description,
        image: demo.image || null,
        embedUrl: demo.embedUrl,
        tags: demo.tags || [],
      },
    });
    console.log(`  [created] ${demo.slug}`);
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
