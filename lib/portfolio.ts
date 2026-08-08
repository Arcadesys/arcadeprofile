import type { SerializedEditorState } from 'lexical';

import downloads from '@/data/portfolio-downloads.json';

import galleryView from '@/data/portfolio-content/gallery-view.json';

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
  };
}

const TITLE_IMAGE_URLS: Record<string, string> = {
  'gallery-view':
    'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/portfolio/gallery-view/622eca4d11701e4ef32da3bf339fb11e0be75e43f7734eaac39d633654efefe2/gallery-view.png',
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
  const record = (downloads as Record<string, { pdf: string }>)[value.slug];
  if (!record) {
    throw new Error(
      `No download record for ${value.slug}. Run \`npm run generate:portfolio\`.`,
    );
  }
  return {
    ...value,
    readingMinutes: Math.ceil(value.wordCount / 225),
    // PDF only. EPUB and print are the paid tier — see lib/collection.ts.
    downloads: { pdf: record.pdf },
  };
}

export const PORTFOLIO_WORKS: readonly PortfolioWork[] = [
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
] as const;

export const PORTFOLIO_SLUGS = PORTFOLIO_WORKS.map((item) => item.slug);

export function getPortfolioWork(slug: string): PortfolioWork | undefined {
  return PORTFOLIO_WORKS.find((item) => item.slug === slug);
}
