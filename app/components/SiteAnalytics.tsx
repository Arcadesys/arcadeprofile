'use client';

import { Analytics } from '@vercel/analytics/react';
import { usePathname } from 'next/navigation';
import { Suspense, useSyncExternalStore } from 'react';
import { canCaptureBrowserAnalytics, shouldTrackSiteAnalytics, sanitizeVercelAnalyticsEvent } from '@/lib/site-analytics';
import { PostHogAnalytics } from './PostHogAnalytics';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Capture only source-owned public pages on the production origin. */
export function SiteAnalytics() {
  const pathname = usePathname();
  // Hydration must match the server's empty output before reading browser state.
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (!hydrated || !shouldTrackSiteAnalytics(pathname)) return null;
  // Next commits history after rendering its new pathname. Preserve the browser
  // origin and credential checks, but validate the route being committed.
  const currentRouteUrl = new URL(pathname, window.location.href).href;
  if (!canCaptureBrowserAnalytics(currentRouteUrl)) return null;
  return <><Suspense fallback={null}><PostHogAnalytics /></Suspense><Analytics beforeSend={sanitizeVercelAnalyticsEvent} /></>;
}
