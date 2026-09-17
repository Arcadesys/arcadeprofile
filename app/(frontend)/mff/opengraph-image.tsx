import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = `Leave the Door Open — ${SITE_NAME}`;

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'An open letter',
    title: 'Leave the Door Open',
    byline: 'On Midwest FurFest, generative AI, and the community I still want to call home.',
  });
}
