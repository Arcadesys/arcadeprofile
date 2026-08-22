import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = `Subscribe — ${SITE_NAME}`;

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Subscribe',
    title: 'Get the next story in your inbox.',
    byline: 'Serialized fiction and essays — every installment as it lands.',
  });
}
