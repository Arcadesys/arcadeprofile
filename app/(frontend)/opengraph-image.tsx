import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { SITE_NAME, SITE_TITLE_DEFAULT } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = SITE_TITLE_DEFAULT;

export default function OgImage() {
  return renderOgCard({
    eyebrow: SITE_NAME,
    title: 'Fiction, essays, and tools by Austen Tucker.',
    byline: 'Serialized writing. New chapters as they land.',
  });
}
