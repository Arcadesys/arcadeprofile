'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const STORAGE_KEY = 'arcade-posthog-anonymous-id';

function getDistinctId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function capture(event: string, properties: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    distinct_id: getDistinctId(),
    event,
    properties: {
      ...properties,
      pathname: window.location.pathname,
      hostname: window.location.hostname,
      $current_url: window.location.href,
      $referrer: document.referrer || undefined,
      analytics_surface: 'sitewide',
    },
  });

  void fetch('/api/analytics/posthog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt navigation or reading.
  });
}

export function PostHogAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    capture('$pageview', {
      landing_page: pathname,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href, window.location.href);
        capture('site link clicked', {
          href,
          label: link.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined,
          link_kind: url.hostname === window.location.hostname ? 'internal' : 'external',
          destination_host: url.hostname,
        });
      } catch {
        capture('site link clicked', { href, link_kind: 'other' });
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
