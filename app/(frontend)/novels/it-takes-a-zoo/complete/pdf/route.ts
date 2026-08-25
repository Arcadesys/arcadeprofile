import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import completeEdition from '@/data/zoo-collection-assets.json';
import { ZOO_COLLECTION_PATH } from '@/lib/zoo-collection-meta';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');
const edition = completeEdition.completeEdition;

export async function GET(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="it-takes-a-zoo-complete.pdf"',
    'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    ETag: `"${edition.sha256}"`,
    Link: `<${SITE_URL}${ZOO_COLLECTION_PATH}>; rel="canonical"`,
    'X-Robots-Tag': 'noindex',
  });
  if (request.headers.get('if-none-match') === `"${edition.sha256}"`) return new NextResponse(null, { status: 304, headers });

  const pdf = await readFile(path.join(process.cwd(), 'public', 'editions', 'it-takes-a-zoo-complete.pdf'));
  return new NextResponse(pdf, { headers });
}
