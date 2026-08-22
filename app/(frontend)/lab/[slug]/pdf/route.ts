import { notFound } from 'next/navigation';

import { markdownToEditorialBlocks, type EditorialPiece } from '@/lib/editorial-piece';
import { editorialPdfResponse } from '@/lib/editorial-pdf-response';
import { requireLabCaseStudy } from '@/lib/lab-case-studies';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const study = requireLabCaseStudy(slug);
    const canonicalPath = `/lab/${study.slug}`;
    const piece: EditorialPiece = {
      id: `lab:${study.slug}`,
      kind: 'lab',
      title: study.title,
      description: study.description,
      author: 'Austen Tucker',
      canonicalPath,
      pdfPath: `${canonicalPath}/pdf`,
      section: 'Case Studies',
      blocks: markdownToEditorialBlocks(study.body),
    };
    return editorialPdfResponse(piece, request);
  } catch {
    notFound();
  }
}
