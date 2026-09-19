'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SearchItem } from '@/lib/search';

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function score(item: SearchItem, terms: string[]): number {
  const title = normalize(item.title);
  const haystack = normalize(item.searchText);
  let total = 0;
  for (const term of terms) {
    if (!haystack.includes(term)) return -1;
    if (title === term) total += 100;
    else if (title.startsWith(term)) total += 35;
    else if (title.includes(term)) total += 20;
    else total += 5;
  }
  return total;
}

export default function SiteSearch({
  items,
  onNavigate,
}: {
  items: SearchItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return items
      .map((item) => ({ item, rank: score(item, terms) }))
      .filter(({ rank }) => rank >= 0)
      .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title))
      .slice(0, 8)
      .map(({ item }) => item);
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const outside = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', outside);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  function finish() {
    setOpen(false);
    setQuery('');
    onNavigate();
  }

  return (
    <div className="site-search" ref={panelRef}>
      <button
        className="site-search__trigger"
        type="button"
        aria-expanded={open}
        aria-controls="site-search-panel"
        onClick={() => setOpen((value) => !value)}
        title="Search the Arcades"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.75" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <span className="nav-label">Search</span>
      </button>

      {open && (
        <section id="site-search-panel" className="site-search__panel" aria-label="Search the Arcades">
          <label htmlFor="site-search-input">Search the Arcades</label>
          <div className="site-search__input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.75" /><path d="m15.5 15.5 5 5" /></svg>
            <input
              id="site-search-input"
              ref={inputRef}
              type="search"
              value={query}
              placeholder="Try “trans”, “AI”, or “fiction”…"
              autoComplete="off"
              aria-controls="site-search-results"
              aria-activedescendant={results[active] ? `site-search-result-${active}` : undefined}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && results.length) {
                  event.preventDefault();
                  setActive((value) => (value + 1) % results.length);
                } else if (event.key === 'ArrowUp' && results.length) {
                  event.preventDefault();
                  setActive((value) => (value - 1 + results.length) % results.length);
                } else if (event.key === 'Enter' && results[active]) {
                  event.preventDefault();
                  document.getElementById(`site-search-result-${active}`)?.click();
                }
              }}
            />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
          </div>

          <div id="site-search-results" className="site-search__results" role="listbox" aria-live="polite">
            {!query.trim() && <p className="site-search__hint">Search essays, stories, series, projects, and pages.</p>}
            {query.trim() && !results.length && <p className="site-search__hint">No doors opened for “{query}”. Try another phrase.</p>}
            {results.map((item, index) => (
              <Link
                id={`site-search-result-${index}`}
                key={item.href}
                href={item.href}
                role="option"
                aria-selected={index === active}
                className={index === active ? 'is-active' : undefined}
                onMouseEnter={() => setActive(index)}
                onClick={finish}
              >
                <span className="site-search__kind">{item.kind}</span>
                <strong>{item.title}</strong>
                <span className="site-search__preview">{item.preview}</span>
              </Link>
            ))}
          </div>
          <p className="site-search__keys" aria-hidden="true">↑↓ choose · Enter open · Esc close</p>
        </section>
      )}
    </div>
  );
}
