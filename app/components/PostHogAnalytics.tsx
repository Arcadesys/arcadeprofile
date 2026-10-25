'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { isPublicReaderPdfDestination, shouldTrackSiteAnalytics } from '@/lib/site-analytics';
import { captureSiteEvent, createPageVisitSender } from '@/lib/posthog-client';
import { observePageLifecycle } from '@/lib/page-lifecycle';

export function PostHogAnalytics() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const visit = useRef<ReturnType<typeof observePageLifecycle> | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    visit.current?.('navigation');
    visit.current = null;
    previousPath.current = pathname;
    if (!shouldTrackSiteAnalytics(pathname)) return;
    visit.current = observePageLifecycle(window, document, createPageVisitSender);
  }, [pathname]);

  useEffect(() => {
    const mounted = ++generation.current;
    // Strict Mode's immediate cleanup/setup must not terminate a real visit.
    return () => { queueMicrotask(() => {
      if (generation.current === mounted) { visit.current?.('unmount'); visit.current = null; }
    }); };
  }, []);

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
        const sameReaderPdf = isPublicReaderPdfDestination(window.location.pathname, url.pathname, window.location.origin, url.origin);
        if (!shouldTrackSiteAnalytics(url.pathname) && url.hostname === window.location.hostname && !sameReaderPdf) return;
        captureSiteEvent('site link clicked', {
          href: url.hostname === window.location.hostname
            ? url.pathname
            : url.hostname === 'work.thearcades.me'
              ? url.origin
              : url.hostname === 'www.amazon.com' && /^\/dp\/[A-Z0-9]{10}$/i.test(url.pathname)
                ? url.href
              : undefined,
          link_kind: url.hostname === window.location.hostname ? 'internal' : 'external',
          destination_host: url.hostname,
          destination_kind: url.origin === 'https://work.thearcades.me' && url.pathname === '/resume' ? 'resume'
            : url.origin === 'https://work.thearcades.me' && url.pathname === '/resume.pdf' ? 'resume_pdf'
              : link.dataset.analyticsDestination,
          placement: link.dataset.analyticsPlacement,
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
