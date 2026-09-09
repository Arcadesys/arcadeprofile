import { editorialEtag, editorialPdfFilename, renderEditorialPdf } from '@/lib/editorial-pdf';
import type { EditorialPiece } from '@/lib/editorial-piece';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

export async function editorialPdfResponse(piece: EditorialPiece, request: Request): Promise<Response> {
  const etag = editorialEtag(piece);
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${editorialPdfFilename(piece)}"`,
    'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    ETag: etag,
    Link: `<${SITE_URL}${piece.canonicalPath}>; rel="canonical"`,
    'X-Robots-Tag': 'noindex',
  });
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });

  if (piece.pdfOverrideUrl) {
    // Curated editions can exceed Next's 2 MB data-cache item limit. Stream
    // them without populating that internal cache; the public response below
    // already carries CDN caching headers.
    const upstreamUrl = new URL(piece.pdfOverrideUrl, request.url);
    const upstream = await fetch(upstreamUrl, { cache: 'no-store' });
    if (upstream.ok && upstream.body) return new Response(upstream.body, { headers });
    // A configured external edition must not make the canonical content unavailable.
  }
  const pdf = await renderEditorialPdf(piece);
  return new Response(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), { headers });
}
