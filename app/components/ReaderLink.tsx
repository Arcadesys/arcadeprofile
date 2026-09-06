'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useReaderEventTracker } from '@/lib/reader-analytics';

type Props = ComponentProps<typeof Link> & {
  canonicalId: string;
  contentType: string;
  placement: string;
};

/** An ordinary crawlable link with optional, non-blocking reader measurement. */
export default function ReaderLink({ canonicalId, contentType, placement, href, onClick, ...props }: Props) {
  const track = useReaderEventTracker();
  return <Link {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented) track('onward-reading', {
      canonicalId, contentType, placement,
      destination: typeof href === 'string' ? href : href.pathname ?? '/',
    });
  }} />;
}
