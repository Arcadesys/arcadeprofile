'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { shouldTrackSiteAnalytics } from '@/lib/site-analytics';
import { captureSiteEvent } from '@/lib/posthog-client';

export function PostHogAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!shouldTrackSiteAnalytics(pathname)) return;
    const params = new URLSearchParams(searchParams.toString());
    captureSiteEvent('$pageview', {
      landing_page: pathname,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!shouldTrackSiteAnalytics(window.location.pathname)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href, window.location.href);
        captureSiteEvent('site link clicked', {
          href: url.hostname === window.location.hostname ? url.pathname : `${url.origin}${url.pathname}`,
          label: link.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined,
          link_kind: url.hostname === window.location.hostname ? 'internal' : 'external',
          destination_host: url.hostname,
        });
      } catch {
        // Malformed destinations are not useful to the reader-path report.
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
