import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Resume — Austen Tucker-Crowder';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'Resume',
    title: 'Austen Tucker-Crowder',
    byline: 'AI Enablement & Transformation · Program Manager · Agile Coach',
  });
}
