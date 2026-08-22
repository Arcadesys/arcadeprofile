import type { Metadata } from 'next';

import { resolveCanonicalUrl } from '@/lib/canonical-url';
import { SITE_NAME } from '@/lib/site-brand';

const DEFAULT_SITE_URL = 'https://www.thearcades.me';

export type EditorialMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  authorName?: string;
  datePublished?: string;
  dateModified?: string;
  section?: string;
  collection?: { name: string; path: string };
  pdfPath?: string;
};

export type EditorialMetadata = {
  metadata: Metadata;
  canonicalUrl: string;
  articleJsonLd: Record<string, unknown>;
  breadcrumbJsonLd: Record<string, unknown>;
};

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/**
 * Keep a public piece's canonical URL, social metadata, Article markup, and
 * breadcrumb markup aligned. The web page remains canonical; a matching PDF
 * is exposed as an Article encoding rather than a competing document URL.
 */
export function buildEditorialMetadata(input: EditorialMetadataInput): EditorialMetadata {
  const site = siteUrl();
  const canonicalUrl = resolveCanonicalUrl(input.path, input.path, site);
  const collectionUrl = input.collection
    ? resolveCanonicalUrl(input.collection.path, input.collection.path, site)
    : undefined;
  const pdfUrl = input.pdfPath ? resolveCanonicalUrl(input.pdfPath, input.pdfPath, site) : undefined;
  const image = input.image ? resolveCanonicalUrl(input.image, input.image, site) : undefined;
  const socialTitle = `${input.title} | ${SITE_NAME}`;

  const articleJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    url: canonicalUrl,
    ...(input.authorName
      ? { author: { '@type': 'Person', name: input.authorName } }
      : { author: { '@id': `${site}/#person` } }),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.section ? { articleSection: input.section } : {}),
    ...(image ? { image } : {}),
    ...(collectionUrl && input.collection
      ? {
          isPartOf: {
            '@type': 'CollectionPage',
            name: input.collection.name,
            url: collectionUrl,
          },
        }
      : {}),
    ...(pdfUrl
      ? {
          encoding: {
            '@type': 'MediaObject',
            contentUrl: pdfUrl,
            encodingFormat: 'application/pdf',
          },
        }
      : {}),
  };

  const crumbs = [
    ...(input.collection && collectionUrl
      ? [{ name: input.collection.name, item: collectionUrl }]
      : []),
    { name: input.title, item: canonicalUrl },
  ];

  return {
    canonicalUrl,
    metadata: {
      title: input.title,
      description: input.description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: 'article',
        title: socialTitle,
        description: input.description,
        url: canonicalUrl,
        ...(image ? { images: [{ url: image, alt: input.title }] } : {}),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title: socialTitle,
        description: input.description,
        ...(image ? { images: [image] } : {}),
      },
    },
    articleJsonLd,
    breadcrumbJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...crumb,
      })),
    },
  };
}
