'use client';

import { buildSiteAnalyticsContext, canCaptureBrowserAnalytics } from '@/lib/site-analytics';
import { readAnalyticsSession, type AnalyticsSession } from '@/lib/analytics-session';
import { buildFreshEntryContext, isAnalyticsId, sanitizeAnalyticsPayload, sanitizeEntryContext, type AnalyticsSurface } from '@/lib/analytics-payload';

const STORAGE_KEY = 'arcade-posthog-anonymous-id';
const SESSION_KEY = 'arcade-posthog-session-v2';
const WINDOW_KEY = 'arcade-posthog-window-id';
const ENTRY_KEY = 'arcade-posthog-entry';
const sessions = new WeakMap<Window, AnalyticsSession>();

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

function buildEntryContext(rotated: boolean) {
  let entry;
  try {
    const saved = window.sessionStorage.getItem(ENTRY_KEY);
    if (saved && !rotated) {
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
  let sessionId: string | undefined;
  let windowId: string | undefined;
  let entry = {};
  if (surface === 'sitewide') {
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { /* Use tab memory. */ }
    const { session, rotated } = readAnalyticsSession(storage, SESSION_KEY, sessions.get(window));
    sessions.set(window, session);
    sessionId = session.id;
    windowId = getId('sessionStorage', WINDOW_KEY);
    entry = buildEntryContext(rotated);
  }
  const payload = sanitizeAnalyticsPayload({
    distinct_id: getId('localStorage', STORAGE_KEY), event,
    properties: { ...properties, ...entry, ...context, $session_id: sessionId, $window_id: windowId },
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
