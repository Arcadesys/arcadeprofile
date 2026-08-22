import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = `Store — ${SITE_NAME}`;

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Store',
    title: 'Books by Austen Tucker-Crowder',
    byline: 'Novels about kids who turn into cartoons — and the world that has to figure out what to do about it.',
  });
}
