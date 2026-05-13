'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SubscribeCTA from '@/app/components/SubscribeCTA';
import styles from './ProjectsIndex.module.css';

export type EntryBucket = 'active' | 'recent' | 'quiet';
export type TypeLetter = 'f' | 'e' | 't' | 'a' | 'c';
export type FilterValue = 'all' | TypeLetter;

export interface FeedItem {
  slug: string;
  title: string;
  date: string;
  href: string;
  partLabel?: string;
}

export interface IndexEntry {
  slug: string;
  title: string;
  description: string;
  href: string;
  image?: string | null;
  category?: string | null;
  status?: string | null;
  bucket: EntryBucket;
  typeLetter: TypeLetter;
  metaTags: string[];
  cadence?: string;
  totalPosts: number;
  feed: FeedItem[];
  latestPost?: FeedItem;
  latestSortKey: number;
}

export interface PulseItem {
  slug: string;
  title: string;
  href: string;
  groupTitle: string;
  groupHref: string;
  date: string;
  relative: string;
}

interface Props {
  entries: IndexEntry[];
  pulse: PulseItem[];
  weekCount: number;
}

const FILTER_LABELS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'f', label: 'Fiction' },
  { value: 'e', label: 'Essays' },
  { value: 't', label: 'Tools' },
  { value: 'a', label: 'Audio/Video' },
];

const SUBSCRIBE_BLURB =
  "New fiction & essays delivered the moment they publish — fiction Mon/Wed/Fri, essays Tue/Thu. New here? Grab La Ligne du Marais — a Paris noir short — when you sign up.";

export default function ProjectsIndex({ entries, pulse, weekCount }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<'recent' | 'alpha'>('recent');

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { all: 0, f: 0, e: 0, t: 0, a: 0, c: 0 };
    for (const e of entries) {
      if (e.bucket === 'quiet') continue;
      c.all += 1;
      c[e.typeLetter] += 1;
    }
    return c;
  }, [entries]);

  const visible = useMemo(() => {
    const filtered = entries.filter((e) => {
      if (e.bucket === 'quiet') return false;
      if (filter === 'all') return true;
      return e.typeLetter === filter;
    });
    if (sort === 'alpha') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort((a, b) => b.latestSortKey - a.latestSortKey);
    }
    return filtered;
  }, [entries, filter, sort]);

  const quietEntries = useMemo(
    () => entries.filter((e) => e.bucket === 'quiet'),
    [entries],
  );

  const showQuiet = filter === 'all' && quietEntries.length > 0;

  return (
    <main className={styles.root}>
      <header className={styles.masthead}>
        <div>
          <div className={styles.eyebrow}>Vol. III &middot; 2026 &middot; perpetually under construction</div>
          <h1 className={styles.title}>
            An index of <em>in-progress things</em>.
          </h1>
          <p className={styles.lede}>
            Fiction, essays, tools, and audio-visual experiments &mdash; collected as project hubs. Listed by recent activity. The last few drops are shown under each.
          </p>
        </div>
        <div className={styles.headMeta}>
          <span>{counts.all} {counts.all === 1 ? 'entry' : 'entries'}</span>
          {weekCount > 0 ? (
            <span className={styles.pulseDot}>
              {weekCount} {weekCount === 1 ? 'post' : 'posts'} this week
            </span>
          ) : null}
        </div>
      </header>

      {pulse.length > 0 ? (
        <section className={styles.pulse} aria-label="This week">
          <span className={styles.pulseLabel}>&#9656; this week</span>
          {pulse.map((item, i) => (
            <span key={item.slug} className={styles.pulseRow}>
              <Link href={item.href} className={styles.pulseLink}>
                <span className={styles.pulseRel}>{item.relative}</span>
                <span className={styles.sep}>&middot;</span>
                <strong>{item.groupTitle}</strong>
                <span className={styles.pulseSep}> / </span>
                <span className={styles.pulseTitle}>{item.title}</span>
              </Link>
              {i < pulse.length - 1 ? <span className={styles.sep}>&middot;</span> : null}
            </span>
          ))}
          <a href="/feed.xml" className={styles.rss}>RSS</a>
        </section>
      ) : null}

      <div className={styles.filters} role="toolbar" aria-label="Filter and sort projects">
        <span className={styles.filtersLabel}>Show</span>
        {FILTER_LABELS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={styles.chip}
            data-filter={opt.value}
            aria-pressed={filter === opt.value}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label} <span className={styles.count}>{counts[opt.value]}</span>
          </button>
        ))}
        <button
          type="button"
          className={styles.sort}
          onClick={() => setSort((s) => (s === 'recent' ? 'alpha' : 'recent'))}
        >
          sort: {sort === 'recent' ? 'recent' : 'a-z'} &#9662;
        </button>
      </div>

      <ol className={styles.entries}>
        {visible.map((e, i) => {
          const hasImage = e.bucket === 'active' && !!e.image;
          const entryClass = [
            styles.entry,
            e.bucket === 'active' ? styles.isActive : styles.isRecent,
            hasImage ? styles.hasImage : '',
          ].filter(Boolean).join(' ');
          return (
            <li key={e.slug} className={entryClass} data-type={e.typeLetter} id={e.slug}>
              <div className={styles.entryNum}>No. {String(i + 1).padStart(2, '0')}</div>
              <div className={styles.entryType}><span className={styles.typeTag}>{e.typeLetter}</span></div>
              {e.bucket === 'active' && e.image ? (
                <Link href={e.href} className={styles.entryImage} aria-hidden="true" tabIndex={-1}>
                  <Image src={e.image} alt="" width={140} height={200} sizes="140px" />
                </Link>
              ) : null}
              <div className={styles.entryBody}>
                <div className={styles.entryHead}>
                  <Link href={e.href} className={styles.entryTitle}>{e.title}</Link>
                  {e.metaTags.map((t) => (
                    <span key={t} className={styles.metaTag}>{t}</span>
                  ))}
                  {e.cadence ? (
                    <span className={`${styles.metaTag} ${styles.metaTagLive}`}>{e.cadence}</span>
                  ) : null}
                </div>
                {e.description ? <p className={styles.entryDesc}>{e.description}</p> : null}

                {e.bucket === 'active' && e.feed.length > 0 ? (
                  <ul className={styles.feed}>
                    {e.feed.map((f) => (
                      <li key={f.slug} className={styles.feedItem}>
                        <Link href={f.href}>
                          {f.partLabel ? <span className={styles.feedNum}>{f.partLabel}</span> : null}
                          <span className={styles.feedTitle}>{f.title}</span>
                          <span className={styles.feedArrow}>&rarr;</span>
                        </Link>
                        <span className={styles.feedDate}>{formatFeedDate(f.date)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {e.bucket === 'active' ? (
                  <div className={styles.entryFoot}>
                    {e.totalPosts > e.feed.length ? (
                      <Link href={e.href} className={styles.ghostLink}>
                        {e.totalPosts - e.feed.length} more {nounFor(e.typeLetter, e.totalPosts - e.feed.length)} &rarr;
                      </Link>
                    ) : null}
                    {e.typeLetter === 'f' ? (
                      <a href="#subscribe" className={`${styles.ghostLink} ${styles.ghostLinkPrimary}`}>subscribe to fiction</a>
                    ) : null}
                    {e.typeLetter === 'e' ? (
                      <a href="#subscribe" className={`${styles.ghostLink} ${styles.ghostLinkPrimary}`}>subscribe to essays</a>
                    ) : null}
                  </div>
                ) : null}

                {e.bucket === 'recent' && e.latestPost ? (
                  <p className={styles.recentLine}>
                    last drop &middot; {relativeAgo(e.latestPost.date)} &middot;{' '}
                    <Link href={e.latestPost.href}>
                      <em>{e.latestPost.title}</em> &rarr;
                    </Link>
                  </p>
                ) : e.bucket === 'recent' ? (
                  <p className={styles.recentLine}>drafting &middot; nothing shipped yet</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {showQuiet ? (
        <section className={styles.quiet}>
          <p className={styles.quietLabel}>
            &mdash; quiet for now &middot; {quietEntries.length} {quietEntries.length === 1 ? 'entry' : 'entries'} &mdash;
          </p>
          <div className={styles.quietList}>
            {quietEntries.map((e, i) => {
              const isDraft = e.totalPosts === 0 && e.status !== 'archived';
              const cls = `${styles.quietChip}${isDraft ? ' ' + styles.quietChipDraft : ''}`;
              return (
                <Link key={e.slug} href={e.href} className={cls}>
                  <span className={styles.qnum}>No. {String(counts.all + i + 1).padStart(2, '0')}</span>
                  {' '}{e.title} &middot; {quietLabel(e)}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.subscribe} id="subscribe">
        <SubscribeCTA
          source="projects"
          magnet="story"
          eyebrow="▸ don't lose the thread"
          heading="Subscribe and keep up with what's shipping."
          blurb={SUBSCRIBE_BLURB}
          buttonLabel="Send updates"
        />
      </section>
    </main>
  );
}

function nounFor(letter: TypeLetter, n: number): string {
  switch (letter) {
    case 'f': return n === 1 ? 'chapter' : 'chapters';
    case 'e': return n === 1 ? 'essay' : 'essays';
    case 'a': return n === 1 ? 'piece' : 'pieces';
    case 't': return n === 1 ? 'release' : 'releases';
    default: return n === 1 ? 'post' : 'posts';
  }
}

function quietLabel(e: IndexEntry): string {
  if (e.status === 'archived') return 'paused';
  if (e.totalPosts === 0) return 'drafting';
  return e.status?.replace(/-/g, ' ') ?? 'paused';
}

function formatFeedDate(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const iso = d.toISOString().slice(0, 10);
  return `${iso} · ${relativeAgo(date)}`;
}

function relativeAgo(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days < 1) return 'today';
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
