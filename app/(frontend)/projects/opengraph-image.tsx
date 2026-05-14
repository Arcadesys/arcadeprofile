import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Projects — The Arcades';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Projects',
    title: 'Fiction, tools, experiments, and more.',
    byline: 'Things Austen Tucker is building, in public.',
  });
}
