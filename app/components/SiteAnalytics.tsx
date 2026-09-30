'use client';

import { Analytics } from '@vercel/analytics/react';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { canCaptureBrowserAnalytics, shouldTrackSiteAnalytics, sanitizeVercelAnalyticsEvent } from '@/lib/site-analytics';
import { PostHogAnalytics } from './PostHogAnalytics';

/** Capture only source-owned public pages on the production origin. */
export function SiteAnalytics() {
  const pathname = usePathname();
  if (!shouldTrackSiteAnalytics(pathname) || !canCaptureBrowserAnalytics()) return null;
  return <><Suspense fallback={null}><PostHogAnalytics /></Suspense><Analytics beforeSend={sanitizeVercelAnalyticsEvent} /></>;
}
