import { notFound } from 'next/navigation';

import { getGroupBySlug } from '@/lib/blog';
import { blogPostToEditorialPiece } from '@/lib/editorial-piece';
import { editorialPdfResponse } from '@/lib/editorial-pdf-response';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; postSlug: string }> }) {
  const { slug, postSlug } = await params;
  const group = await getGroupBySlug(slug);
  const post = group?.posts.find((entry) => entry.slug === postSlug);
  if (!post) notFound();
  return editorialPdfResponse(blogPostToEditorialPiece(post, group!.title), request);
}
