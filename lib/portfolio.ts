import type { SerializedEditorState } from 'lexical';

import cleanupOnPodSix from '@/data/portfolio-content/cleanup-on-pod-six.json';
import galleryView from '@/data/portfolio-content/gallery-view.json';
import laLigneDuMarais from '@/data/portfolio-content/la-ligne-du-marais.json';
import mrTroutsSlide from '@/data/portfolio-content/mr-trout-s-slide.json';
import ourHopeChest from '@/data/portfolio-content/our-hope-chest.json';
import partsOfTheWhole from '@/data/portfolio-content/parts-of-the-whole.json';

export interface PortfolioWork {
  slug: string;
  title: string;
  excerpt: string;
  wordCount: number;
  readingMinutes: number;
  content: SerializedEditorState;
  titleImage: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  artwork?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  downloads: {
    pdf: string;
    epub: string;
  };
}

const TITLE_IMAGE_URLS: Record<string, string> = {
  'our-hope-chest':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/our-hope-chest/7f14194ff5859c2e0059f14ceef1a7a2265d6a0767529f5abf05bded73216bcf/our-hope-chest.png',
  'cleanup-on-pod-six':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/cleanup-on-pod-six/df582f32a6cc31b275010b5ae9dd942a2c614b17a88c3d2f595e6b973cbafc6a/cleanup-on-pod-six.png',
  'mr-trout-s-slide':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/mr-trout-s-slide/ed4ebf41e8fe1e80fd0e7e8f50486322c3e8e6281979c6a6f4584c5bf26e8bf9/mr-trout-s-slide.png',
  'gallery-view':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/gallery-view/622eca4d11701e4ef32da3bf339fb11e0be75e43f7734eaac39d633654efefe2/gallery-view.png',
  'parts-of-the-whole':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/parts-of-the-whole/a774c0ff93d823f50506299192adff80c82872ec7b0c8a95903c4f01360dfe3e/parts-of-the-whole.png',
  'la-ligne-du-marais':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/la-ligne-du-marais/56a413f67244aa384fb02616d75048c66ee83998a2a7d2f14857ee4af61c825c/la-ligne-du-marais.png',
};

function titleImage(slug: string, alt: string): PortfolioWork['titleImage'] {
  const src = TITLE_IMAGE_URLS[slug];
  if (!src) throw new Error(`Missing title image for ${slug}`);
  return {
    src,
    alt,
    width: 1536,
    height: 1024,
  };
}

function work(
  value: Omit<PortfolioWork, 'readingMinutes' | 'downloads'>,
): PortfolioWork {
  return {
    ...value,
    readingMinutes: Math.ceil(value.wordCount / 225),
    downloads: {
      pdf: `/portfolio/${value.slug}.pdf`,
      epub: `/portfolio/${value.slug}.epub`,
    },
  };
}

export const PORTFOLIO_WORKS: readonly PortfolioWork[] = [
  work({
    slug: 'our-hope-chest',
    title: 'Our Hope Chest',
    excerpt:
      'Siblings Heather and Xander use magical animal costumes to escape family upheaval until a public transformation forces their private refuge into the open.',
    wordCount: 4287,
    content: ourHopeChest as SerializedEditorState,
    titleImage: titleImage(
      'our-hope-chest',
      'Our Hope Chest — glowing animal costumes inside a weathered chest in a dark attic',
    ),
  }),
  work({
    slug: 'cleanup-on-pod-six',
    title: 'Cleanup on Pod Six',
    excerpt:
      'A luddite janitor and an Amish teenager clean the waste beneath virtual-reality pods while debating whether Ubiq can save a resource-starved world.',
    wordCount: 2006,
    content: cleanupOnPodSix as SerializedEditorState,
    titleImage: titleImage(
      'cleanup-on-pod-six',
      'Cleanup on Pod Six — a janitor’s cart and boots beside glowing virtual-reality pods',
    ),
  }),
  work({
    slug: 'mr-trout-s-slide',
    title: 'Mr. Trout’s Slide',
    excerpt:
      'A despairing Chicagoan follows a mysterious map to a lakeside Shifter and discovers that the route to Atlantis runs down a very unusual slide.',
    wordCount: 2100,
    content: mrTroutsSlide as SerializedEditorState,
    titleImage: titleImage(
      'mr-trout-s-slide',
      'Mr. Trout’s Slide — a moonlit slide descends from a lakeside cabin into luminous water',
    ),
  }),
  work({
    slug: 'gallery-view',
    title: 'Gallery View',
    excerpt:
      'An isolated artist builds a hidden virtual gallery around a portrait of Jamie while their Zoo community turns an uncertain gift into an act of trust.',
    wordCount: 7166,
    content: galleryView as SerializedEditorState,
    titleImage: titleImage(
      'gallery-view',
      'Gallery View — a luminous portrait at the center of a hidden virtual gallery',
    ),
    artwork: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/gallery-view-artwork/73b7ab70aac4ecd303a5b8161a2aeb6860bafb44f7a7fa2fa3d52f3a941f3f1b/gallery-view-artwork.png',
      alt: 'Gallery View',
      width: 1024,
      height: 1536,
    },
  }),
  work({
    slug: 'parts-of-the-whole',
    title: 'Parts of the Whole',
    excerpt:
      'When Audrey’s kitsune half awakens, her friend Lance confronts conversion therapy, his Catholic family, and the life he wants with Steve.',
    wordCount: 10517,
    content: partsOfTheWhole as SerializedEditorState,
    titleImage: titleImage(
      'parts-of-the-whole',
      'Parts of the Whole — a stained-glass fox assembled from luminous human and kitsune pieces',
    ),
  }),
  work({
    slug: 'la-ligne-du-marais',
    title: 'La Ligne du Marais',
    excerpt:
      'A gambler chases a rumor through Le Marais and finds the smallest casino in the world.',
    wordCount: 2965,
    content: laLigneDuMarais as SerializedEditorState,
    titleImage: titleImage(
      'la-ligne-du-marais',
      'La Ligne du Marais — a foggy Paris alley leads to a tiny glowing casino',
    ),
  }),
] as const;

export const PORTFOLIO_SLUGS = PORTFOLIO_WORKS.map((item) => item.slug);

export function getPortfolioWork(slug: string): PortfolioWork | undefined {
  return PORTFOLIO_WORKS.find((item) => item.slug === slug);
}
