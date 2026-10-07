export type BookStage = 'available' | 'forthcoming' | 'development';
export type BookSection = 'current' | 'next' | '2027' | 'development' | 'backlist';

export type BookAction = {
  label: string;
  href: string;
  external?: boolean;
};

export interface BookInfo {
  slug: string;
  title: string;
  description: string;
  stage: BookStage;
  section: BookSection;
  releaseYear?: number;
  format?: string;
  publisher?: string;
  series?: string;
  seriesPosition?: number;
  coverImage?: string;
  coverAlt?: string;
  editionNote?: string;
  actions: readonly BookAction[];
  nextSlug?: string;
}

export const BOOKS: readonly BookInfo[] = [
  {
    slug: 'this-is-what-i-do-for-fun',
    title: 'This is what I do for fun',
    description:
      'A collection of short fiction: androids, kitsune, hypersleep pods, and the smallest casino in Paris.',
    stage: 'available',
    section: 'current',
    releaseYear: 2026,
    format: 'Short-fiction collection',
    publisher: 'Free Play Publishing',
    actions: [
      { label: 'Read the collection', href: '/this-is-what-i-do-for-fun' },
    ],
    nextSlug: 'estelles-children',
  },
  {
    slug: 'estelles-children',
    title: "Estelle's Children",
    description:
      'A Chicago witch’s parlor opens onto a growing sisterhood, told through oral histories, letters, journals, photographs, and the people carrying a family history forward.',
    stage: 'forthcoming',
    section: 'next',
    releaseYear: 2026,
    format: 'Fiction',
    publisher: 'Free Play Publishing',
    actions: [
      { label: 'Read the preview', href: '/novels/estelles-children' },
    ],
    nextSlug: 'bait-and-switch',
  },
  {
    slug: 'bait-and-switch',
    title: 'Bait and Switch',
    description:
      'Fenton’s father is building a movement to ban toons from the real world just as Fenton starts becoming one.',
    stage: 'forthcoming',
    section: '2027',
    releaseYear: 2027,
    format: 'Novel',
    publisher: 'Free Play Publishing',
    series: 'Ink and Paint Trilogy',
    seriesPosition: 1,
    coverImage: '/images/books/baitandswitch.jpg',
    coverAlt: 'Cover of Bait and Switch.',
    editionNote: 'A new Free Play Publishing edition is planned for 2027.',
    actions: [],
    nextSlug: 'the-painted-cat',
  },
  {
    slug: 'the-painted-cat',
    title: 'The Painted Cat',
    description:
      'Janet keeps two lives: small-town teacher Miss Perch and Bunny Cat, the cartoon self she paints into being. The wall between them is starting to crack.',
    stage: 'forthcoming',
    section: '2027',
    releaseYear: 2027,
    format: 'Novel',
    publisher: 'Free Play Publishing',
    series: 'Ink and Paint Trilogy',
    seriesPosition: 2,
    coverImage: '/images/books/thepaintedcat.jpg',
    coverAlt: 'Cover of The Painted Cat.',
    editionNote: 'A new Free Play Publishing edition is planned for 2027.',
    actions: [],
    nextSlug: 'the-two-flat-cats',
  },
  {
    slug: 'the-two-flat-cats',
    title: 'The Two-Flat Cats',
    description:
      'The concluding novel in the Ink and Paint Trilogy, returning as part of the new Free Play Publishing editions.',
    stage: 'forthcoming',
    section: '2027',
    releaseYear: 2027,
    format: 'Novel',
    publisher: 'Free Play Publishing',
    series: 'Ink and Paint Trilogy',
    seriesPosition: 3,
    editionNote: 'The trilogy finale is planned for publication with the first two books in 2027.',
    actions: [],
    nextSlug: 'it-takes-a-zoo',
  },
  {
    slug: 'it-takes-a-zoo',
    title: 'It Takes a Zoo',
    description:
      'Jamie discovers the Zoo, a private virtual world where people choose their bodies and make room for each other.',
    stage: 'forthcoming',
    section: '2027',
    releaseYear: 2027,
    format: 'Novel-in-stories',
    publisher: 'Free Play Publishing',
    actions: [
      { label: 'Read the serial', href: '/novels/it-takes-a-zoo' },
    ],
    nextSlug: 'butterfly-exe',
  },
  {
    slug: 'butterfly-exe',
    title: 'butterfly.exe',
    description: 'A novel in development.',
    stage: 'development',
    section: 'development',
    releaseYear: 2028,
    format: 'Novel',
    publisher: 'Free Play Publishing',
    actions: [],
    nextSlug: 'the-witch-who-sold-the-world',
  },
  {
    slug: 'the-witch-who-sold-the-world',
    title: 'The Witch Who Sold the World',
    description: 'A novel in development.',
    stage: 'development',
    section: 'development',
    releaseYear: 2028,
    format: 'Novel',
    publisher: 'Free Play Publishing',
    actions: [],
  },
  {
    slug: 'a-fuzzy-place',
    title: 'A Fuzzy Place',
    description:
      'Stories and memoir from a decade in furry, tracing identity, community, and the places that helped shape a life.',
    stage: 'available',
    section: 'backlist',
    format: 'Collection',
    coverImage: '/images/books/afuzzyplace.jpg',
    coverAlt: 'Cover of A Fuzzy Place.',
    actions: [
      { label: 'Buy on Amazon', href: 'https://www.amazon.com/dp/B00H7K7EYQ', external: true },
    ],
    nextSlug: 'closet-cats',
  },
  {
    slug: 'closet-cats',
    title: 'Closet Cats',
    description:
      'Three romantic short stories about lesbians, trans people, catgirls, dragons, magic, and becoming more yourself.',
    stage: 'available',
    section: 'backlist',
    format: 'Short-story collection',
    coverImage: '/images/books/closetcats.jpg',
    coverAlt: 'Cover of Closet Cats.',
    actions: [
      { label: 'Buy on Amazon', href: 'https://www.amazon.com/dp/B0B311T8P1', external: true },
    ],
    nextSlug: 'this-is-what-i-do-for-fun',
  },
];

export const HOME_BOOK_SLUGS = [
  'this-is-what-i-do-for-fun',
  'estelles-children',
  'bait-and-switch',
] as const;

const BOOK_BY_SLUG = new Map(BOOKS.map((book) => [book.slug, book]));

export function getBook(slug: string): BookInfo | undefined {
  return BOOK_BY_SLUG.get(slug);
}

export function bookPath(book: BookInfo): string {
  return `/books/${book.slug}`;
}

export function bookStatusLabel(book: BookInfo): string {
  if (book.stage === 'available') {
    return book.section === 'backlist'
      ? 'Backlist · available now'
      : book.releaseYear
        ? `${book.releaseYear} · available now`
        : 'Available now';
  }
  if (book.stage === 'forthcoming') {
    return book.releaseYear ? `Coming ${book.releaseYear}` : 'Coming soon';
  }
  return book.releaseYear ? `In development · ${book.releaseYear}` : 'In development';
}

export const HOME_BOOKS = HOME_BOOK_SLUGS.map((slug) => {
  const book = getBook(slug);
  if (!book) throw new Error(`Unknown home-book slug: ${slug}`);
  return book;
});
