'use client';

import { useEffect, useRef } from 'react';

import { captureMffEvent as capture } from '@/lib/posthog-client';
import { canCaptureBrowserAnalytics } from '@/lib/site-analytics';
import { buildFreshEntryContext } from '@/lib/analytics-payload';

function normalizeLabel(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
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
  // One receipt per mounted visit/milestone, including Strict Mode effect replay.
  const visit = useRef({ pageViewed: false, reached: new Set<number>(), sections: new Set<string>(), exhibits: new Set<string>() });
  useEffect(() => {
    if (!canCaptureBrowserAnalytics()) return;
    const root = document.getElementById('mff-page');
    if (!root) return;

    if (!visit.current.pageViewed) {
      visit.current.pageViewed = true;
      capture('mff page viewed', buildFreshEntryContext(window.location.href, document.referrer, 'mff_manifesto'));
    }

    const reached = visit.current.reached;
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

    const viewedSections = visit.current.sections;
    const viewedExhibits = visit.current.exhibits;

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
