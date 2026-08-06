export interface Hit {
  slug: string;
  title: string;
  description: string;
  editionType: 'Short story' | 'Interactive gamebook';
  coverAlt: string;
  playPath?: string;
}

export const HITS: readonly Hit[] = [
  {
    slug: 'carl',
    title: 'Carl',
    description:
      'An aging Floor-Mart android is told it is time to turn himself in, but he has only ever known how to keep working.',
    editionType: 'Short story',
    coverAlt: 'Black ink emblem of an android face and cart wheel on cloth-white paper.',
  },
  {
    slug: 'parts-of-the-whole',
    title: 'Parts of the Whole',
    description:
      'When Audrey’s kitsune half awakens, Lance confronts conversion therapy, his Catholic family, and the life he wants with Steve.',
    editionType: 'Short story',
    coverAlt: 'Black ink fox mask split by a white fracture on cloth-white paper.',
  },
  {
    slug: 'butterfly-exe',
    title: 'Butterfly.exe',
    description:
      'An interactive-fiction story about uploading, grief, and what a copy of someone is worth.',
    editionType: 'Interactive gamebook',
    coverAlt: 'Black ink butterfly breaking into square digital fragments on cloth-white paper.',
    playPath: '/toys/butterfly-exe',
  },
  {
    slug: 'our-hope-chest',
    title: 'Our Hope Chest',
    description:
      'Siblings Heather and Xander use magical animal costumes to escape family upheaval until a public transformation forces their private refuge into the open.',
    editionType: 'Short story',
    coverAlt: 'Open black ink hope chest with animal ears and a tail emerging on cloth-white paper.',
  },
  {
    slug: 'cleanup-on-pod-six',
    title: 'Cleanup on Pod Six',
    description:
      'A luddite janitor and an Amish teenager clean the waste beneath virtual-reality pods while debating whether Ubiq can save a resource-starved world.',
    editionType: 'Short story',
    coverAlt: 'Black ink hypersleep pod above an exclamation-point brushstroke on cloth-white paper.',
  },
  {
    slug: 'la-ligne-du-marais',
    title: 'La Ligne du Marais',
    description:
      'A gambler chases a rumor through Le Marais and finds the smallest casino in the world.',
    editionType: 'Short story',
    coverAlt: 'Black ink roulette wheel cut by a decisive diagonal line on cloth-white paper.',
  },
  {
    slug: 'mr-trout-s-slide',
    title: 'Mr. Trout’s Slide',
    description:
      'A despairing Chicagoan follows a mysterious map to a lakeside Shifter and discovers that the route to Atlantis runs down a very unusual slide.',
    editionType: 'Short story',
    coverAlt: 'Black ink playground slide descending into a fish-shaped lake ripple on cloth-white paper.',
  },
] as const;

export function getHit(slug: string): Hit | undefined {
  return HITS.find((hit) => hit.slug === slug);
}

export function hitDownloads(slug: string) {
  const base = `/the-hits/${slug}/${slug}`;
  return { pdf: `${base}.pdf`, epub: `${base}.epub` };
}
