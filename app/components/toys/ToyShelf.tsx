'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { ToyCatalogEntry } from '@/data/toys/catalog';
import {
  EMPTY_TOY_PASSPORT,
  latestInProgressToy,
  readToyPassport,
  TOY_PASSPORT_STORAGE_KEY,
  type ToyPassport,
  type ToyProgress,
} from '@/lib/toys/toy-passport';
import styles from '@/app/(frontend)/toys/toys.module.css';

type ToyShelfProps = {
  toys: readonly ToyCatalogEntry[];
};

function progressLabel(
  toy: ToyCatalogEntry,
  progress: ToyProgress | undefined,
): string {
  if (toy.completionMode === 'tabletop') return toy.status;
  if (toy.completionMode === 'linear' && progress?.endingIds.length) {
    return 'Completed';
  }
  if (progress?.endingIds.length) {
    return `${progress.endingIds.length}/${toy.outcomeCount} outcomes`;
  }
  if (progress && progress.visitedPassageIds.length > 1) return 'In progress';
  if (toy.isNew) return 'New';
  return toy.status;
}

function actionLabel(
  toy: ToyCatalogEntry,
  progress: ToyProgress | undefined,
): string {
  if (toy.completionMode === 'tabletop') return 'Read the module';
  if (progress && !progress.atEnding && progress.visitedPassageIds.length > 1) {
    return 'Continue playing';
  }
  if (toy.completionMode === 'linear' && progress?.endingIds.length) {
    return 'Read again';
  }
  if (progress?.endingIds.length) return 'Find another outcome';
  return 'Play this toy';
}

export default function ToyShelf({ toys }: ToyShelfProps) {
  const [passport, setPassport] = useState<ToyPassport>(EMPTY_TOY_PASSPORT);
  const orderedToys = useMemo(() => [...toys].reverse(), [toys]);
  const latestProgress = latestInProgressToy(passport);
  const continueToy = latestProgress
    ? toys.find(({ id }) => id === latestProgress[0])
    : undefined;

  useEffect(() => {
    function refreshPassport() {
      setPassport(readToyPassport());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === TOY_PASSPORT_STORAGE_KEY) refreshPassport();
    }

    refreshPassport();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('toy-passport-updated', refreshPassport);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('toy-passport-updated', refreshPassport);
    };
  }, []);

  return (
    <>
      {continueToy && latestProgress ? (
        <section aria-labelledby="continue-toy" className={styles.continueCard}>
          <div>
            <p>Continue playing</p>
            <h2 id="continue-toy">{continueToy.title}</h2>
            <span>
              Pick up at {latestProgress[1].currentPassageId} ·{' '}
              {latestProgress[1].visitedPassageIds.length} passages explored
            </span>
          </div>
          <Link href={continueToy.href}>Resume →</Link>
        </section>
      ) : null}

      <ul className={styles.toyGrid}>
        {orderedToys.map((toy, index) => {
          const progress = passport.games[toy.id];

          return (
            <li key={toy.id}>
              <Link className={styles.toyLink} href={toy.href}>
                <div className={styles.cover}>
                  {toy.image ? (
                    <Image
                      alt={toy.image.alt}
                      height={toy.image.height}
                      priority={index < 2}
                      sizes="(max-width: 760px) 100vw, 480px"
                      src={toy.image.src}
                      width={toy.image.width}
                    />
                  ) : (
                    <span aria-hidden="true" className={styles.coverFallback}>
                      {toy.title}
                    </span>
                  )}
                </div>
                <div className={styles.toyCopy}>
                  <h3>{toy.title}</h3>
                  <div className={styles.toyMeta}>
                    <span>{toy.kind}</span>
                    <span data-progress={progress ? 'true' : undefined}>
                      {progressLabel(toy, progress)}
                    </span>
                  </div>
                  <p>{toy.description}</p>
                  <strong>
                    {actionLabel(toy, progress)}{' '}
                    <span aria-hidden="true">→</span>
                  </strong>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
