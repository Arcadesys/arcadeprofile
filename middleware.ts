import { NextRequest, NextResponse } from 'next/server';

import { PRIVATE_INTERNAL_PATHS, PRIVATE_ROUTE_REWRITES } from '@/lib/private-routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const internalPath = PRIVATE_ROUTE_REWRITES[pathname];

  if (internalPath) {
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url);
  }

  // Keep implementation routes from being guessable/shareable while a page is
  // soft-published. The UUID route above is the only public doorway.
  if (PRIVATE_INTERNAL_PATHS.has(pathname)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
