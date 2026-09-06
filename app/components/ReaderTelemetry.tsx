'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { useReaderEventTracker, type ReaderTelemetryProps } from '@/lib/reader-analytics';

type Props = ReaderTelemetryProps & {
  children: ReactNode;
  endPlacement?: string;
};

/**
 * Wrap a reader body to record a page start and a visible arrival at its end.
 * The terminal marker is hidden from assistive technology and adds no storage.
 */
export default function ReaderTelemetry({
  children,
  endPlacement = 'reader-end',
  canonicalId,
  contentType,
  placement,
  destination,
}: Props) {
  const endMarkerRef = useRef<HTMLSpanElement>(null);
  const trackReaderEvent = useReaderEventTracker();

  useEffect(() => {
    trackReaderEvent('reading-start', { canonicalId, contentType, placement, destination });

    const marker = endMarkerRef.current;
    if (!marker || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackReaderEvent('end-reached', {
        canonicalId,
        contentType,
        placement: endPlacement,
        destination: 'none',
      });
      observer.disconnect();
    });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [canonicalId, contentType, destination, endPlacement, placement, trackReaderEvent]);

  return (
    <>
      {children}
      <span
        ref={endMarkerRef}
        aria-hidden="true"
        data-reader-telemetry-end
        style={{ display: 'block', width: 1, height: 1 }}
      />
    </>
  );
}
