'use client';

import { Analytics } from '@vercel/analytics/react';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { PostHogAnalytics } from './PostHogAnalytics';

/** Suppress both analytics clients on pages whose URL fragment is a bearer token. */
export function SiteAnalytics() {
  const pathname = usePathname();
  if (pathname === '/subscribe/verify' || pathname === '/subscribe/unsubscribe') return null;
  return <><Suspense fallback={null}><PostHogAnalytics /></Suspense><Analytics /></>;
}
