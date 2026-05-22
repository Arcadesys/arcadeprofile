import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Bio — Free Play Publishing';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Bio',
    title: 'Austen Tucker-Crowder',
    byline: 'AI enablement leader, program manager, agile coach, builder of weird things.',
  });
}
