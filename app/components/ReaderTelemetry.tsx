'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { trackReaderEvent, type ReaderTelemetryProps } from '@/lib/reader-analytics';

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
  ...context
}: Props) {
  const endMarkerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    trackReaderEvent('reading-start', context);

    const marker = endMarkerRef.current;
    if (!marker || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackReaderEvent('end-reached', {
        ...context,
        placement: endPlacement,
        destination: 'none',
      });
      observer.disconnect();
    });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [context, endPlacement]);

  return (
    <>
      {children}
      <span ref={endMarkerRef} aria-hidden="true" data-reader-telemetry-end />
    </>
  );
}
