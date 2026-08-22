import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = `Bio — ${SITE_NAME}`;

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Bio',
    title: 'Austen Tucker-Crowder',
    byline: 'AI enablement leader, program manager, agile coach, builder of weird things.',
  });
}
