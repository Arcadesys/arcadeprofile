import { editorialPdfResponse } from '@/lib/editorial-pdf-response';
import { buildResumeEditorialPiece } from '@/lib/resume';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return editorialPdfResponse(buildResumeEditorialPiece(), request);
}
