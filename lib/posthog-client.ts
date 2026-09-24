'use client';

import { buildSiteAnalyticsContext } from '@/lib/site-analytics';

const STORAGE_KEY = 'arcade-posthog-anonymous-id';

function getDistinctId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function referrerOrigin() {
  try {
    return document.referrer ? new URL(document.referrer).origin : undefined;
  } catch {
    return undefined;
  }
}

/** Only page and UI context belongs here; never pass form values or token URLs. */
export function captureSiteEvent(event: string, properties: Record<string, unknown> = {}) {
  const context = buildSiteAnalyticsContext(window.location.pathname, window.location.href);
  if (!context) return;

  const body = JSON.stringify({
    distinct_id: getDistinctId(),
    event,
    properties: {
      ...properties,
      ...context,
      hostname: window.location.hostname,
      $referrer: referrerOrigin(),
      analytics_surface: 'sitewide',
    },
  });

  void fetch('/api/analytics/posthog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt navigation, reading, or a signup.
  });
}
