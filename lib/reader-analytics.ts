'use client';

import { inject, type BeforeSend } from '@vercel/analytics';
import { track } from '@vercel/analytics/react';
import { useLayoutEffect, useState } from 'react';
import { captureSiteEvent } from '@/lib/posthog-client';
import { canCaptureBrowserAnalytics, sanitizeVercelAnalyticsEvent } from '@/lib/site-analytics';
import { sanitizeReaderProperties } from '@/lib/analytics-payload';

/**
 * The reader event payload intentionally contains only page and UI context.
 * Do not add email addresses, visitor IDs, or values from browser storage.
 */
export type ReaderTelemetryProps = Readonly<{
  canonicalId: string;
  contentType: string;
  placement: string;
  destination: string;
}>;

export type ReaderEventName =
  | 'reading-start'
  | 'end-reached'
  | 'onward-reading'
  | 'resume-click'
  | 'signup-request'
  | 'signup-failed'
  | 'signup-success';

export type ReaderEventSender = (
  event: ReaderEventName,
  properties: ReaderTelemetryProps,
) => void;

type AnalyticsInjector = (options: { framework: 'react'; beforeSend: BeforeSend }) => void;

/**
 * Starts Vercel's own in-memory queue before reader effects can call track().
 * The SDK is idempotent: the shared Analytics component sees the same script
 * later and does not inject another one. Failures stay nonblocking.
 */
export function initializeReaderAnalytics(injectAnalytics: AnalyticsInjector = inject): void {
  if (!canCaptureBrowserAnalytics()) return;
  try {
    injectAnalytics({ framework: 'react', beforeSend: sanitizeVercelAnalyticsEvent });
  } catch {
    // Analytics must never block reading, navigation, or a successful signup.
  }
}

function eventKey(event: ReaderEventName, properties: ReaderTelemetryProps): string {
  return [
    event,
    properties.canonicalId,
    properties.contentType,
    properties.placement,
    properties.destination,
  ].join('\u0000');
}

/** Creates a page-lifetime, privacy-safe event reporter. */
export function createReaderEventTracker(send: ReaderEventSender) {
  const sent = new Set<string>();

  return (event: ReaderEventName, properties: ReaderTelemetryProps): boolean => {
    const key = eventKey(event, properties);
    if (sent.has(key)) return false;
    sent.add(key);
    try {
      send(event, properties);
      return true;
    } catch {
      // Measurement must never interrupt a reader action or signup success.
      return false;
    }
  };
}

/**
 * Creates a deduped event reporter for one mounted page visit. React preserves
 * this ref through development Strict Mode's effect replay, but a client
 * navigation creates a new reporter so revisiting a piece is measurable.
 */
export function useReaderEventTracker() {
  // Layout effects run before the reader body's passive effects, including on a
  // cold direct load. That gives the Vercel SDK time to install window.va.
  useLayoutEffect(() => {
    initializeReaderAnalytics();
  }, []);

  const [tracker] = useState(() =>
    createReaderEventTracker((event, properties) => {
      if (!canCaptureBrowserAnalytics()) return;
      const safeProperties = sanitizeReaderProperties(properties);
      if (!safeProperties) return;
      try {
        track(event, safeProperties);
      } catch {
        // The PostHog receipt remains useful if Vercel Analytics is unavailable.
      }
      captureSiteEvent(event === 'signup-success' ? 'signup confirmation requested' : event === 'signup-request'
        ? 'signup request submitted' : event === 'signup-failed' ? 'signup request failed' : event, safeProperties);
    }),
  );
  return tracker;
}
