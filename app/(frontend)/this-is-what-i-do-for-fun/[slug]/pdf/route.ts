import { notFound } from 'next/navigation';

import { getStory } from '@/lib/collection';
import { collectionStoryToEditorialPiece } from '@/lib/editorial-piece';
import { editorialPdfResponse } from '@/lib/editorial-pdf-response';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();
  return editorialPdfResponse(collectionStoryToEditorialPiece(story), request);
}
