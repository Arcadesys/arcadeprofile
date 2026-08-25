import { NextResponse } from 'next/server';

import completeEdition from '@/data/zoo-collection-assets.json';
import { ZOO_COLLECTION_PATH } from '@/lib/zoo-collection-meta';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.thearcades.me').replace(/\/+$/, '');
const edition = completeEdition.completeEdition;

export async function GET(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="it-takes-a-zoo-complete.pdf"',
    'Cache-Control': 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=604800',
    'Content-Length': String(edition.bytes),
    ETag: `"${edition.sha256}"`,
    Link: `<${SITE_URL}${ZOO_COLLECTION_PATH}>; rel="canonical"`,
    'X-Robots-Tag': 'noindex',
  });
  if (request.headers.get('if-none-match') === `"${edition.sha256}"`) return new NextResponse(null, { status: 304, headers });

  const upstream = await fetch(edition.url, { cache: 'force-cache' });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: 'Complete edition unavailable.' }, { status: 502 });
  return new NextResponse(upstream.body, { headers });
}
