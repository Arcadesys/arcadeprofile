/** Verification fragments are bearer tokens and must never enter client analytics. */
export function shouldTrackSiteAnalytics(pathname: string) {
  return pathname !== '/subscribe/verify' && pathname !== '/subscribe/unsubscribe';
}

export function buildSiteAnalyticsContext(pathname: string, currentUrl: string) {
  if (!shouldTrackSiteAnalytics(pathname)) return null;
  return { pathname, $current_url: currentUrl };
}
