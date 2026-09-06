'use client';

import Link from 'next/link';

import { TOY_CATALOG } from '@/data/toys/catalog';
import { absoluteSiteUrl } from '@/lib/site-url';
import { trackToyEvent } from '@/lib/toys/toy-analytics';
import styles from './ToyEndingPanel.module.css';

type ToyEndingPanelProps = {
  toyId: string;
  endingTitle: string;
  endingsFound: number;
  onRestart: () => void;
};

export default function ToyEndingPanel({
  toyId,
  endingTitle,
  endingsFound,
  onRestart,
}: ToyEndingPanelProps) {
  const toy = TOY_CATALOG.find(({ id }) => id === toyId);
  const nextToy = TOY_CATALOG.find(({ id }) => id === toy?.nextToyId);
  const isBranching = toy?.completionMode === 'branching';
  const outcomeCount = toy?.outcomeCount ?? 1;
  const foundAll = endingsFound >= outcomeCount;
  const shareText = encodeURIComponent(
    `I reached “${endingTitle}” in ${toy?.title ?? 'an ArcadeProfile toy'}.`,
  );
  const shareUrl = encodeURIComponent(
    absoluteSiteUrl(toy?.href ?? '/toys'),
  );

  function restart() {
    trackToyEvent('toy_restarted', toyId, { endingsFound });
    onRestart();
  }

  return (
    <section aria-labelledby="toy-ending-title" className={styles.panel}>
      <p className={styles.eyebrow}>
        {isBranching ? 'Outcome discovered' : 'Story complete'}
      </p>
      <h2 className={styles.title} id="toy-ending-title">
        {endingTitle}
      </h2>
      <p className={styles.progress}>
        {isBranching
          ? `${endingsFound} of ${outcomeCount} outcomes found${
              foundAll ? ' — full set complete.' : '.'
            }`
          : 'Saved to your Toy Passport on this device.'}
      </p>

      <div className={styles.actions}>
        {isBranching ? (
          <button className={styles.secondaryAction} onClick={restart} type="button">
            Try another path
          </button>
        ) : (
          <button className={styles.secondaryAction} onClick={restart} type="button">
            Read again
          </button>
        )}
        <Link className={styles.primaryAction} href="/toys">
          View Toy Passport
        </Link>
      </div>

      {nextToy ? (
        <Link
          className={styles.nextToy}
          href={nextToy.href}
          onClick={() =>
            trackToyEvent('next_toy_started', toyId, { nextToy: nextToy.id })
          }
        >
          <span>Keep playing</span>
          <strong>Next toy: {nextToy.title} →</strong>
        </Link>
      ) : null}

      <nav aria-label="Ending links" className={styles.quietLinks}>
        <a
          href={`https://bsky.app/intent/compose?text=${shareText}%20${shareUrl}`}
          rel="noreferrer"
          target="_blank"
        >
          Share this ending ↗
        </a>
        <Link href="/subscribe">Get new toys by email</Link>
      </nav>
    </section>
  );
}
