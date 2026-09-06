'use client';

import { track } from '@vercel/analytics/react';

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
  | 'signup-success';

export type ReaderEventSender = (
  event: ReaderEventName,
  properties: ReaderTelemetryProps,
) => void;

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
    send(event, properties);
    return true;
  };
}

/**
 * Sends one event per unique event/context tuple for this loaded page.
 * This deliberately does not use localStorage, cookies, or a visitor key.
 */
export const trackReaderEvent = createReaderEventTracker((event, properties) => {
  track(event, properties);
});
