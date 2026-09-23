import { renderOgCard } from '@/lib/og-template';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return renderOgCard({
    eyebrow: SITE_NAME,
    title: 'Fiction, essays, and tools by Austen Tucker.',
    byline: 'Serialized writing. New chapters as they land.',
  });
}
