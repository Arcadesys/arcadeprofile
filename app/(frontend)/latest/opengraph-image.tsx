import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Latest — The Arcades';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Latest',
    title: 'New writing from The Arcades',
    byline: 'Fresh fiction and essays by Austen Tucker.',
  });
}
