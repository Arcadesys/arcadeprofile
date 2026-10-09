'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { shouldTrackSiteAnalytics } from '@/lib/site-analytics';
import { captureSiteEvent } from '@/lib/posthog-client';

export function PostHogAnalytics() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (!shouldTrackSiteAnalytics(pathname)) return;
    captureSiteEvent('$pageview');
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!shouldTrackSiteAnalytics(window.location.pathname)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      if (href.toLowerCase().startsWith('mailto:')) {
        captureSiteEvent('site link clicked', { link_kind: 'contact' });
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (!['http:', 'https:'].includes(url.protocol)) return;
        if (!shouldTrackSiteAnalytics(url.pathname) && url.hostname === window.location.hostname) return;
        captureSiteEvent('site link clicked', {
          href: url.hostname === window.location.hostname
            ? url.pathname
            : url.hostname === 'work.thearcades.me'
              ? url.origin
              : undefined,
          link_kind: url.hostname === window.location.hostname ? 'internal' : 'external',
          destination_host: url.hostname,
          destination_kind: url.origin === 'https://work.thearcades.me' && url.pathname === '/resume' ? 'resume'
            : url.origin === 'https://work.thearcades.me' && url.pathname === '/resume.pdf' ? 'resume_pdf' : undefined,
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
