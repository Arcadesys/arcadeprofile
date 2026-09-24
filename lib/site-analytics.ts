/** Verification fragments are bearer tokens and must never enter client analytics. */
export function shouldTrackSiteAnalytics(pathname: string) {
  return pathname !== '/subscribe/verify' && pathname !== '/subscribe/unsubscribe';
}

export function buildSiteAnalyticsContext(pathname: string, currentUrl: string) {
  if (!shouldTrackSiteAnalytics(pathname)) return null;

  try {
    const url = new URL(currentUrl);
    return {
      pathname,
      $pathname: pathname,
      $host: url.hostname,
      $current_url: `${url.origin}${url.pathname}`,
    };
  } catch {
    return {
      pathname,
      $pathname: pathname,
      $current_url: currentUrl,
    };
  }
}
