'use client';

import { buildSiteAnalyticsContext } from '@/lib/site-analytics';

const STORAGE_KEY = 'arcade-posthog-anonymous-id';
const SESSION_KEY = 'arcade-posthog-session-id';
const ENTRY_KEY = 'arcade-posthog-entry';
const SAFE_CAMPAIGN_VALUE = /^[a-z0-9_-]{1,64}$/;

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

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function buildEntryContext() {
  try {
    const saved = window.sessionStorage.getItem(ENTRY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      return parsed;
    }
  } catch {
    // Fall through to a fresh entry context.
  }

  const entry: Record<string, string> = {
    landing_page: window.location.pathname,
  };

  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.protocol === 'http:' || referrer.protocol === 'https:') {
        entry.$referrer = referrer.origin;
        entry.referring_domain = referrer.hostname;
      }
    }
  } catch {
    // Invalid referrers are simply ignored.
  }

  try {
    const params = new URL(window.location.href).searchParams;
    for (const key of ['source', 'medium', 'campaign', 'content', 'term']) {
      const value = params.get(`utm_${key}`)?.toLowerCase();
      if (value && SAFE_CAMPAIGN_VALUE.test(value)) entry[`utm_${key}`] = value;
    }
  } catch {
    // Malformed URLs cannot contribute campaign context.
  }

  try {
    window.sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
  } catch {
    // Analytics remains best-effort when session storage is unavailable.
  }

  return entry;
}

/** Only page and UI context belongs here; never pass form values or token URLs. */
export function captureSiteEvent(event: string, properties: Record<string, unknown> = {}) {
  const context = buildSiteAnalyticsContext(window.location.pathname, window.location.href);
  if (!context) return;

  const sessionId = getSessionId();
  const entry = buildEntryContext();

  const body = JSON.stringify({
    distinct_id: getDistinctId(),
    event,
    properties: {
      ...properties,
      ...context,
      ...entry,
      hostname: window.location.hostname,
      $session_id: sessionId,
      $window_id: sessionId,
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
