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

const groups: GroupSeed[] = [
  {
    title: 'The Singularity Log',
    slug: 'the-singularity-log',
    description: 'A serialized fiction project exploring AI, identity, and the edges of personhood.',
    category: 'fiction',
    status: 'active',
    featured: true,
    tags: ['ai', 'sci-fi', 'serial'],
  },
  {
    title: 'The White Cane Chronicles',
    slug: 'the-white-cane-chronicles',
    description: 'Essays and stories about navigating the world with low vision — disability, access, and the gap between how things are designed and how people actually live.',
    category: 'writing',
    status: 'active',
    featured: true,
    tags: ['disability', 'memoir', 'essays'],
  },
  {
    title: 'Short Stories',
    slug: 'short-stories',
    description: 'Standalone short fiction — queer, furry, speculative, and otherwise.',
    category: 'fiction',
    status: 'active',
    tags: ['fiction', 'short-stories'],
  },
  // Pico Panic is seeded by scripts/seed-pico-panic.ts (which also seeds the
  // launch article alongside the group).
  // TODO: add remaining ~5 groups below — copy the shape above
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
