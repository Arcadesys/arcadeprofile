export type ToyCatalogEntry = {
  id: string;
  title: string;
  href: `/toys/${string}`;
  kind: string;
  status: string;
  description: string;
  /**
   * Optional cover art. Toys without artwork fall back to a typographic cover
   * built from the title, so a story can ship before its art does.
   */
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export const TOY_CATALOG: readonly ToyCatalogEntry[] = [
  {
    id: 'interspecies-dating-is-hard',
    title: 'Interspecies Dating is Hard',
    href: '/toys/interspecies-dating-is-hard',
    kind: 'Interactive fiction',
    status: 'Playable now',
    description:
      'You have $75, a few hours, and one chance to plan the right date for Tess.',
    image: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/interspecies-dating-is-hard/locations/clampett-crossroads-2ba6YQyTWm7FcTX0uokK7fVKH1fSYB.png',
      alt: 'A lively Clampett crossroads with impossible streets and routes into the Toon city',
      width: 840,
      height: 560,
    },
  },
  {
    id: 'butterfly-exe',
    title: 'Butterfly.exe',
    href: '/toys/butterfly-exe',
    kind: 'Interactive fiction',
    status: 'Playable now',
    description:
      'Sherry uploads tonight. You get one last evening with the body she is leaving behind.',
  },
];
