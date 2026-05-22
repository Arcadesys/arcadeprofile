import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Subscribe — Free Play Publishing';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Subscribe',
    title: 'Get the next story in your inbox.',
    byline: 'Serialized fiction and essays — every installment as it lands.',
  });
}
