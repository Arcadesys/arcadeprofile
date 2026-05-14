import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'The Arcades — Austen Tucker';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'The Arcades',
    title: 'Fiction, essays, and tools by Austen Tucker.',
    byline: 'Serialized writing. New chapters as they land.',
  });
}
