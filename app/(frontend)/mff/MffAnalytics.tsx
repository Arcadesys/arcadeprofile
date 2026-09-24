'use client';

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

function normalizeLabel(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
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
      analytics_surface: 'mff_manifesto',
    },
  });

  void fetch('/api/analytics/mff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt reading.
  });
}

function sectionFor(element: Element) {
  let node: Element | null = element;
  while (node) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'H2') return normalizeLabel(sibling.textContent);
      const nested = sibling.querySelector?.('h2:last-of-type');
      if (nested) return normalizeLabel(nested.textContent);
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return undefined;
}

export function MffAnalytics() {
  useEffect(() => {
    const root = document.getElementById('mff-page');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    capture('mff page viewed', {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      landing_page: window.location.pathname,
    });

    const reached = new Set<number>();
    const milestones = [25, 50, 75, 90, 100];

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));

      for (const milestone of milestones) {
        if (percent >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          capture('mff scroll reached', { percent: milestone });
        }
      }
    };

    const viewedSections = new Set<string>();
    const viewedExhibits = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (entry.target.tagName === 'H2') {
            const section = normalizeLabel(entry.target.textContent);
            if (section && !viewedSections.has(section)) {
              viewedSections.add(section);
              capture('mff section viewed', { section });
            }
            continue;
          }

          if (entry.target.tagName === 'FIGURE') {
            const heading = normalizeLabel(entry.target.querySelector('h3')?.textContent);
            const exhibit = normalizeLabel(entry.target.querySelector('figcaption p')?.textContent);
            const key = heading || exhibit;
            if (key && !viewedExhibits.has(key)) {
              viewedExhibits.add(key);
              capture('mff exhibit viewed', { exhibit, heading });
            }
          }
        }
      },
      { threshold: 0.45 },
    );

    root.querySelectorAll('h2, figure').forEach((element) => observer.observe(element));

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!link || !root.contains(link)) return;

      const href = link.getAttribute('href') || '';
      let destinationHost: string | undefined;
      let linkKind: 'internal' | 'external' | 'other' = 'other';

      try {
        const url = new URL(href, window.location.href);
        destinationHost = url.hostname;
        linkKind = url.hostname === window.location.hostname ? 'internal' : 'external';
      } catch {
        // Keep non-URL hrefs classified as "other".
      }

      capture('mff link clicked', {
        href,
        label: normalizeLabel(link.textContent),
        link_kind: linkKind,
        destination_host: destinationHost,
        section: sectionFor(link),
      });
    };

    const sources = root.querySelector('details');
    const onToggle = () => {
      if (sources instanceof HTMLDetailsElement && sources.open) {
        capture('mff sources opened', { section: 'Sources & further reading' });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('click', onClick);
    sources?.addEventListener('toggle', onToggle);
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      root.removeEventListener('click', onClick);
      sources?.removeEventListener('toggle', onToggle);
    };
  }, []);

  return null;
}
