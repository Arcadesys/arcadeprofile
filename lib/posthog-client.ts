'use client';

import { buildSiteAnalyticsContext, canCaptureBrowserAnalytics } from '@/lib/site-analytics';
import { buildFreshEntryContext, isAnalyticsId, sanitizeAnalyticsPayload, sanitizeEntryContext, type AnalyticsSurface } from '@/lib/analytics-payload';

const STORAGE_KEY = 'arcade-posthog-anonymous-id';
const SESSION_KEY = 'arcade-posthog-session-id';
const ENTRY_KEY = 'arcade-posthog-entry';

function getId(storage: 'localStorage' | 'sessionStorage', key: string) {
  try {
    const existing = window[storage].getItem(key);
    if (isAnalyticsId(existing)) return existing;
    const created = crypto.randomUUID();
    window[storage].setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function buildEntryContext() {
  let entry;
  try {
    const saved = window.sessionStorage.getItem(ENTRY_KEY);
    if (saved) {
      const sanitized = sanitizeEntryContext(JSON.parse(saved));
      if (sanitized.landing_page) entry = sanitized;
    }
  } catch { /* Fall through to fresh, sanitized entry context. */ }
  entry ??= buildFreshEntryContext(window.location.href, document.referrer);
  try { window.sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry)); } catch { /* Best effort. */ }
  return entry;
}

function capture(event: string, properties: Record<string, unknown>, surface: AnalyticsSurface) {
  if (!canCaptureBrowserAnalytics()) return;
  const context = buildSiteAnalyticsContext(window.location.pathname, window.location.href);
  if (!context || (surface === 'mff_manifesto' && context.pathname !== '/mff')) return;
  const sessionId = surface === 'sitewide' ? getId('sessionStorage', SESSION_KEY) : undefined;
  const entry = surface === 'sitewide' ? buildEntryContext() : {};
  const payload = sanitizeAnalyticsPayload({
    distinct_id: getId('localStorage', STORAGE_KEY), event,
    properties: { ...properties, ...entry, ...context, $session_id: sessionId, $window_id: sessionId },
  }, surface);
  if (!payload) return;
  void fetch(surface === 'sitewide' ? '/api/analytics/posthog' : '/api/analytics/mff', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true,
  }).catch(() => { /* Analytics must never interrupt reading, navigation or signup. */ });
}

/** No form values or token URLs. Both this boundary and the receiver enforce it. */
export function captureSiteEvent(event: string, properties: Record<string, unknown> = {}) {
  capture(event, properties, 'sitewide');
}

export function captureMffEvent(event: string, properties: Record<string, unknown> = {}) {
  capture(event, {
    ...properties,
    // Preserve MFF's referrer on every event, and UTMs only on its page receipt.
    ...sanitizeEntryContext({ $referrer: document.referrer }, 'mff_manifesto'),
  }, 'mff_manifesto');
}
