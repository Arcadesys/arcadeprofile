/**
 * Seed the Groups collection with project/series hubs.
 * Idempotent — skips any group whose slug already exists.
 *
 * Usage:
 *   npm run seed:groups
 */
import { getPayload } from 'payload';
import configPromise from '../payload.config';

interface GroupSeed {
  title: string;
  slug: string;
  description: string;
  category: 'fiction' | 'tools' | 'experiments' | 'audio-video' | 'community' | 'writing';
  status: 'active' | 'available' | 'in-progress' | 'archived';
  featured?: boolean;
  homeHighlight?: boolean;
  tags?: string[];
  href?: string;
  external?: boolean;
  projectCTA?: {
    label: string;
    href: string;
    type: 'preview' | 'buy' | 'experiment' | 'youtube' | 'audio' | 'repo' | 'download' | 'other';
  };
  resources?: Array<{
    label: string;
    href: string;
    kind: 'post' | 'preview' | 'buy' | 'youtube' | 'audio' | 'experiment' | 'repo' | 'download' | 'other';
    description?: string;
    external?: boolean;
  }>;
}

// Mirrors production groups (https://arcadeprofile.vercel.app/api/groups).
// Pico Panic is seeded separately by scripts/seed-pico-panic.ts (which also
// seeds the launch article alongside the group).
const groups: GroupSeed[] = [
  {
    title: 'The Singularity Log',
    slug: 'the-singularity-log',
    description: 'Essays on AI, creativity, and the collapsing scarcity model.',
    category: 'writing',
    status: 'active',
    featured: true,
    homeHighlight: true,
    tags: ['ai', 'creativity', 'economics'],
  },
  {
    title: 'It Takes a Zoo',
    slug: 'it-takes-a-zoo',
    description: `A novel-in-stories about chosen family in a hypercapitalist near-future.

The Zoo is a small private server that throws open its door to anyone who needs somewhere quiet, weird, and kind — rain on cobblestone, jazz in the warm dark, no advertisements, no logout button.

Cold Boot, the opening arc, starts with a coworker sliding Jamie a card across a virtual cubicle and saying: I'm about to change your life. New parts post Mondays, Wednesdays, and Fridays.`,
    category: 'fiction',
    status: 'active',
    featured: true,
    homeHighlight: true,
  },
  {
    title: 'White Cane Chronicles',
    slug: 'white-cane-chronicles',
    description: 'Essays on accessibility, blindness, and neurodiversity.',
    category: 'writing',
    status: 'active',
    tags: ['accessibility', 'disability', 'neurodiversity'],
  },
  {
    title: 'AI Art Experiments',
    slug: 'ai-art-experiments',
    description: 'A catch-all for all the things I make using AI generation.',
    category: 'audio-video',
    status: 'active',
    homeHighlight: true,
  },
  {
    title: 'Short Stories',
    slug: 'short-stories',
    description: 'Original fiction.',
    category: 'fiction',
    status: 'active',
    tags: ['fiction'],
  },
  {
    title: 'On Writing',
    slug: 'on-writing',
    description: 'Essays on the craft of writing.',
    category: 'writing',
    status: 'active',
    tags: ['writing', 'craft'],
  },
  {
    title: 'Arcade Blog',
    slug: 'arcade-blog',
    description: 'Essays on AI productivity, engineering culture, and what the data actually says.',
    category: 'writing',
    status: 'active',
    tags: ['ai', 'productivity', 'engineering', 'data'],
  },
];

async function main() {
  const payload = await getPayload({ config: configPromise });

  console.log('Seeding groups...');

  for (const group of groups) {
    const existing = await payload.find({
      collection: 'groups',
      where: { slug: { equals: group.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  [skip] ${group.slug} (already exists)`);
      continue;
    }

    await payload.create({
      collection: 'groups',
      data: {
        title: group.title,
        slug: group.slug,
        description: group.description,
        category: group.category,
        status: group.status,
        featured: group.featured ?? false,
        homeHighlight: group.homeHighlight ?? false,
        external: group.external ?? false,
        href: group.href ?? '',
        tags: (group.tags ?? []).map(t => ({ tag: t })),
        ...(group.projectCTA ? { projectCTA: group.projectCTA } : {}),
        ...(group.resources ? { resources: group.resources } : {}),
      },
    });

    console.log(`  [created] ${group.title}`);
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
