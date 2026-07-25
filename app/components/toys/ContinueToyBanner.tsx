'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TOY_CATALOG } from '@/data/toys/catalog';
import {
  latestInProgressToy,
  readToyPassport,
  type ToyProgress,
} from '@/lib/toys/toy-passport';

type ContinueState = {
  progress: ToyProgress;
  title: string;
  href: `/toys/${string}`;
};

export default function ContinueToyBanner() {
  const [current, setCurrent] = useState<ContinueState | null>(null);

  useEffect(() => {
    const latest = latestInProgressToy(readToyPassport());
    const toy = latest
      ? TOY_CATALOG.find(({ id }) => id === latest[0])
      : undefined;

    if (latest && toy) {
      setCurrent({ progress: latest[1], title: toy.title, href: toy.href });
    }
  }, []);

  if (!current) return null;

  return (
    <section style={{ margin: '0 0 2rem' }}>
      <Link
        href={current.href}
        style={{
          display: 'block',
          padding: '0.95rem 1.1rem',
          color: 'var(--fg)',
          background: 'rgba(255,138,0,0.08)',
          border: '1px solid rgba(255,138,0,0.55)',
          borderRadius: '0.5rem',
          textDecoration: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            marginBottom: '0.3rem',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Continue playing
        </span>
        <strong>{current.title}</strong>
        <span
          style={{
            display: 'block',
            marginTop: '0.25rem',
            color: 'var(--fg-muted)',
            fontSize: '0.9rem',
          }}
        >
          Resume at {current.progress.currentPassageId} →
        </span>
      </Link>
    </section>
  );
}
