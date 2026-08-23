'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export type DrawerItem = {
  num: string | number;
  label: string;
  href?: string;
  state?: 'read' | 'current' | 'unread';
};

export type DrawerSection = {
  title: string;
  items: DrawerItem[];
};

export type DocDrawerProps = {
  eyebrow?: string;
  groupTitle: string;
  groupTitleEm?: string;
  author?: string;
  year?: string | number;
  currentPosition: number;
  totalCount: number;
  sections: DrawerSection[];
  prevHref?: string;
  nextHref?: string;
};

export default function DocDrawer({
  eyebrow,
  groupTitle,
  groupTitleEm,
  author,
  year,
  currentPosition,
  totalCount,
  sections,
  prevHref,
  nextHref,
}: DocDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const currentItemRef = useRef<HTMLAnchorElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.add('has-doc-drawer');
    return () => { document.body.classList.remove('has-doc-drawer'); };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 780px)');
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dd-open', open);
    return () => { document.body.classList.remove('dd-open'); };
  }, [open]);

  // Scroll current item into view on mount
  useEffect(() => {
    if (currentItemRef.current && (open || !isCompact)) {
      currentItemRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [isCompact, open]);

  useEffect(() => {
    if (open && isCompact) closeRef.current?.focus();
  }, [isCompact, open]);

  // Close on outside click / Escape; ←/→ navigate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevHref) window.location.href = prevHref;
      if (e.key === 'ArrowRight' && nextHref) window.location.href = nextHref;
    }
    function onDoc(e: MouseEvent) {
      const drawer = document.getElementById('doc-drawer');
      const toggle = document.getElementById('dd-toggle');
      if (drawer && !drawer.contains(e.target as Node) && !toggle?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDoc);
    };
  }, [nextHref, open, prevHref]);

  const progressPct = Math.round((currentPosition / totalCount) * 100);

  // Split groupTitle at groupTitleEm to build the title with an em highlight
  function renderTitle() {
    if (!groupTitleEm || !groupTitle.includes(groupTitleEm)) {
      return <div className="dd-group-title">{groupTitle}</div>;
    }
    const [before, after] = groupTitle.split(groupTitleEm);
    return (
      <div className="dd-group-title">
        {before}<em>{groupTitleEm}</em>{after}
      </div>
    );
  }

  return (
    <>
      <div
        className={`dd-scrim${open ? ' visible' : ''}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <button
        ref={toggleRef}
        id="dd-toggle"
        className="dd-toggle"
        aria-label={open ? 'Close document navigation' : 'Open document navigation'}
        aria-expanded={open}
        aria-controls="doc-drawer"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >
        {open ? 'Close' : 'Series'}
      </button>

      <aside
        id="doc-drawer"
        className={`doc-drawer${open ? ' open' : ''}`}
        aria-label="Document position in series"
        aria-hidden={isCompact && !open ? true : undefined}
        inert={isCompact && !open ? true : undefined}
      >
        <div className="dd-head">
          <button
            ref={closeRef}
            type="button"
            className="dd-close"
            onClick={() => {
              setOpen(false);
              toggleRef.current?.focus();
            }}
          >
            Close series
          </button>
          {eyebrow && <div className="dd-eyebrow">{eyebrow}</div>}
          {renderTitle()}
          <div className="dd-meta">
            <span>{[author, year].filter(Boolean).join(' · ')}</span>
            <span className="dd-position">Pt {currentPosition} / {totalCount}</span>
          </div>
          <div
            className="dd-progress"
            aria-label={`Reading progress: ${progressPct}%`}
          >
            <span style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <nav className="dd-list" id="dd-list" ref={listRef} aria-label="Chapter list">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="dd-section">{section.title}</div>
              {section.items.map((item) => {
                const isCurrent = item.state === 'current';
                const cls = `dd-item${item.state ? ` ${item.state}` : ''}`;
                const inner = (
                  <>
                    <span className="num">{String(item.num).padStart(2, '0')}</span>
                    <span className="label">{item.label}</span>
                  </>
                );
                if (item.href) {
                  return (
                    <Link
                      key={`${item.num}-${item.label}`}
                      href={item.href}
                      className={cls}
                      aria-current={isCurrent ? 'page' : undefined}
                      ref={isCurrent ? currentItemRef : undefined}
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <span
                    key={`${item.num}-${item.label}`}
                    className={cls}
                    aria-current={isCurrent ? 'page' : undefined}
                    ref={isCurrent ? (currentItemRef as React.RefObject<HTMLSpanElement>) : undefined}
                  >
                    {inner}
                  </span>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dd-foot">
          {prevHref ? (
            <Link href={prevHref} className="dd-nav prev" aria-label="Previous chapter">← Prev</Link>
          ) : (
            <span className="dd-nav prev disabled" aria-disabled="true">← Prev</span>
          )}
          <div className="dd-fraction">
            <strong>{currentPosition}</strong> / {totalCount}
          </div>
          {nextHref ? (
            <Link href={nextHref} className="dd-nav next" aria-label="Next chapter">Next →</Link>
          ) : (
            <span className="dd-nav next disabled" aria-disabled="true">Next →</span>
          )}
        </div>
      </aside>
    </>
  );
}
