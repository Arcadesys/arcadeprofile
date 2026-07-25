export type ToyCatalogEntry = {
  id: string;
  title: string;
  href: `/toys/${string}`;
  kind: string;
  status: string;
  description: string;
  outcomeCount: number;
  completionMode: 'branching' | 'linear';
  nextToyId: string;
  isNew?: boolean;
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
    outcomeCount: 7,
    completionMode: 'branching',
    nextToyId: 'butterfly-exe',
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
    outcomeCount: 3,
    completionMode: 'branching',
    nextToyId: 'the-day-i-split-in-two',
    image: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/virtuport-prep-xMxqVTM556H0JLsEd1UniHDt3YW7QM.webp',
      alt: 'A near-future medical preparation room overlooking the Virtuport city at night',
      width: 1536,
      height: 1024,
    },
  },
  {
    id: 'justice-porn',
    title: 'Justice Porn',
    href: '/toys/justice-porn',
    kind: 'Interactive fiction',
    status: 'Playable now',
    description:
      'The verdict is in. The law has made punishment faster, cleaner, and impossible to look away from.',
    outcomeCount: 1,
    completionMode: 'linear',
    nextToyId: 'shoot-em-up',
    isNew: true,
    image: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/justice-porn/courtroom-g0Xzy1umwB05ziSOk6A1HDqL2LSc16.webp',
      alt: 'An old courthouse transformed into a sterile tiled sentencing chamber',
      width: 1536,
      height: 1024,
    },
  },
  {
    id: 'shoot-em-up',
    title: "Shoot 'em Up",
    href: '/toys/shoot-em-up',
    kind: 'Interactive fiction',
    status: 'Playable now',
    description:
      'You are in a room with a guy, a tea service, and a Desert Eagle. What will you do?',
    outcomeCount: 2,
    completionMode: 'branching',
    nextToyId: 'interspecies-dating-is-hard',
    isNew: true,
    image: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/room-0WJO7OjVDnYupKZdQZEfolBkfv5weM.webp',
      alt: 'A plain, dark room with two chairs and a tea service under one light',
      width: 1536,
      height: 1024,
    },
  },
  {
    id: 'the-day-i-split-in-two',
    title: 'The Day I Split in Two',
    href: '/toys/the-day-i-split-in-two',
    kind: 'Interactive memoir',
    status: 'Playable now',
    description:
      'I met a two-tailed fox inside my head. She helped me tear a house down. Then we rebuilt.',
    outcomeCount: 1,
    completionMode: 'linear',
    nextToyId: 'justice-porn',
    isNew: true,
    image: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/dream-house-dmJ5eDyRWyJDkueRoh1kvOR1brjLvr.webp',
      alt: 'An unfinished brick house standing in purple mist beneath distant galaxies',
      width: 1536,
      height: 1024,
    },
  },
];
