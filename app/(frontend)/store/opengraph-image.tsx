import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Store — Free Play Publishing';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Store',
    title: 'Books by Austen Tucker-Crowder',
    byline: 'Novels about kids who turn into cartoons — and the world that has to figure out what to do about it.',
  });
}
