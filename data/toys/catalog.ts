export type ToyCatalogEntry = {
  id: string;
  title: string;
  href: `/toys/${string}`;
  kind: string;
  status: string;
  description: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export const TOY_CATALOG = [
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
] as const satisfies readonly ToyCatalogEntry[];
