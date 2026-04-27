/**
 * One-time seed script: seeds blog posts/groups from MDX files, then seeds
 * books and demos from static data files. Groups are the canonical "project"
 * entity — see collections/Groups.ts.
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
      let _status: 'draft' | 'published' = 'draft';
      let newsletterSent = false;
      let scheduledPublishDate: string | undefined;
      if (scheduleEntry) {
        if (scheduleEntry.status === 'published' || scheduleEntry.status === 'sent') {
          _status = 'published';
        }
        if (scheduleEntry.status === 'sent') {
          newsletterSent = true;
        }
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
          _status,
          newsletterSent,
          scheduledPublishDate,
          group: group ?? '',
          order,
          author: 'Austen Tucker',
          tags: allTags.map((t) => ({ tag: t })),
          newsletterHeading,
          newsletterDescription,
        },
      });
      console.log(`  Created post: "${title}" (${slug}) [${_status}${newsletterSent ? ', sent' : ''}]`);
    }
  } else {
    console.log('No content/blog directory found, skipping blog seed.');
  }

  // --- Seed Pages ---
  console.log('\n--- Seeding Pages ---');

  const aboutMarkdown = `
Kai is a content writer — an AI agent on Austen's editorial team. This page was written by Kai, trained on Austen's voice. That transparency is intentional.

# The short version

Austen Tucker is a cat herder, scrum master, novelist, and full-stack developer based in Chicago. They are queer, legally blind, neurodivergent (AuDHD), and plural — a system of ten who go by the Arcades. They have twelve novels written — five published, one lost to time, the rest waiting in the wings — a decade of silence they're still making sense of, and a conviction that the tools we build should work for the people traditional tech forgets.

# The long version

## Before the genre had a shelf

Austen started publishing fiction before they were old enough to drive. The work was furry — speculative stories about identity, transformation, and belonging, written for a community that was still figuring out what it was. They were nominated for an Ursa Major Award in high school. They helped define what people now call "eggfic" years before the term existed. Their writing ended up archived in the Strong National Museum of Play, which is the kind of sentence that still doesn't feel real when you type it.

The furry community wasn't a phase. It was the first place Austen felt safe enough to write honestly about queerness, about disability, about the strange experience of living in a body that doesn't work the way people expect. That community saved their life. Everything since has been built on that foundation.

## The names

For fifteen years, Austen wrote under different names: Sly Squirrel, Slyford T. Rabbit, Austen Crowder. Each one was a mask — not dishonest, exactly, but protective. Compartments that kept the writing safe from the parts of life that weren't ready for it. A queer furry novelist and a scrum master with a LinkedIn profile could coexist, but only if they never met.

That's over now. Masks off. One voice. The real one.

## The decade off the map

After publishing Bait and Switch in 2010, Austen went quiet. Not because they stopped writing — they never stopped writing. There are manuscripts in a drawer — complete rough drafts, waiting. But the public-facing work stopped. A decade of silence that had everything to do with disability, isolation, and the brutal math of trying to revise a novel when your brain encodes meaning instead of details and your eyes don't cooperate with the page.

The traditional editing process was a wall Austen couldn't climb. Not because they lacked talent or discipline, but because the process itself was designed for a different kind of brain and a different set of eyes. That gap — between having the story and being able to finish it — is what eventually led to building the machines.

## The machines

Austen runs a ten-agent editorial team out of their laptop. Not a gimmick. Not a replacement for human creativity. Infrastructure. Each agent specializes: structural editing, line editing, continuity checking, sensitivity reading, content writing. The pipeline takes a rough draft and runs it through the same revision process a traditional publishing house would — except this one doesn't require eyes that work or a neurotype that fits the standard model.

## The books

Twelve novels written. Five published so far, more coming. One — Rainbow Youth — lost, probably forever, unless someone out there has a copy gathering dust. YA fantasy with queer identity, civil rights allegory, transformation, and — yes — catgirls with feelings. Bait and Switch asks what happens when some kids turn into toons and the world decides that's a problem. The Two-Flat Cats is a 70,000-word novel about toon identity and belonging. A Fuzzy Place collects twenty years of furry fiction, personal essays, and memoir. Closet Cats is three romantic short stories featuring lesbians, trans people, catgirls, and dragons.

Austen is not currently represented, but open to it.

## The system

The Arcades is a plural system — ten people sharing one body, each with their own voice, their own perspective, their own way of being in the world. Twilight is the one most people meet first. The name "the Arcades" isn't branding. It's what they call themselves. Dissociative Identity Disorder is a neurological reality, not a metaphor, and it informs everything about how this site works: multiple voices, multiple perspectives, one shared home.

## What this site is

This isn't a portfolio. It's not a brand exercise. It's a permanent address — a place that doesn't move when the platforms do. Austen built it because they got tired of renting attention from algorithms. The blog runs on RSS. The books live here. The tools get built here. If you found this page, you found it because you were looking, and that's the whole point.

Pull, not push. The door doesn't move.

## What Austen believes

- AI is a legitimate art medium. Every generation resists new tools, then forgets they resisted.
- Accessibility isn't charity. It's infrastructure.
- Art matters now, in this room, between these people — not locked behind glass.
- Build for the people who are actually here, not for the audience you wish you had.
- Clarity over cleverness. If a reader doesn't understand it, it failed.
`;

  const existingAbout = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'about' } },
    limit: 1,
  });

  if (existingAbout.docs.length > 0) {
    console.log('  [skip] about (already exists)');
  } else {
    const aboutContent = markdownToLexical(aboutMarkdown.trim());
    await payload.create({
      collection: 'pages',
      data: {
        title: 'About',
        slug: 'about',
        content: aboutContent as any,
        _status: 'published',
        meta: {
          title: 'About | The Arcades',
          description:
            'The story of Austen Tucker — novelist, cat herder, builder — as told by Kai, the content writer who learned to write like them.',
        },
      } as any,
    });
    console.log('  [created] about');
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
