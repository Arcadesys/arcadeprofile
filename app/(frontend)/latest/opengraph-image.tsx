import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = `Latest — ${SITE_NAME}`;

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Latest',
    title: `New writing from ${SITE_NAME}`,
    byline: 'Fresh fiction and essays by Austen Tucker.',
  });
}
