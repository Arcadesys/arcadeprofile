import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/api/schedule', '/api/blog', '/api/social', '/api/marketing'];

function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  if (isProtected && !isLocalhost(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/schedule/:path*',
    '/api/blog/:path*',
    '/api/social/:path*',
    '/api/marketing/:path*',
  ],
};
