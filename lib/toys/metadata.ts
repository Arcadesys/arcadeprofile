import type { Metadata } from 'next';

const SITE_NAME = 'Free Play Publishing';
const DEFAULT_SOCIAL_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Free Play Publishing — Austen Tucker',
};

type ToySocialImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type ToyMetadataInput = {
  title: string;
  description: string;
  path: `/toys${string}`;
  image?: ToySocialImage;
};

export function buildToyMetadata({
  title,
  description,
  path,
  image,
}: ToyMetadataInput): Metadata {
  const socialTitle = `${title} | ${SITE_NAME}`;
  const socialImage = image
    ? {
        url: image.src,
        width: image.width,
        height: image.height,
        alt: image.alt,
      }
    : DEFAULT_SOCIAL_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      title: socialTitle,
      description,
      url: path,
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [socialImage],
    },
  };
}
