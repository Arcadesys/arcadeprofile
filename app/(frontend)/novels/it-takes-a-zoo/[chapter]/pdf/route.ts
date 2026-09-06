import { notFound } from 'next/navigation';

import { editorialPdfResponse } from '@/lib/editorial-pdf-response';
import { getZooChapter, zooChapterToEditorialPiece } from '@/lib/zoo-collection';

type Context = { params: Promise<{ chapter: string }> };

export async function GET(request: Request, { params }: Context) {
  const chapter = getZooChapter((await params).chapter);
  if (!chapter) notFound();
  return editorialPdfResponse(zooChapterToEditorialPiece(chapter), request);
}
