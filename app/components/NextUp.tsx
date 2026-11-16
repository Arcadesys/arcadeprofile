import { canonicalDiscoveryHref } from '@/lib/post-canonical';
import { readingMinutesLabel, recommendationKind } from '@/lib/next-up';
import type { ReadingPiece } from '@/lib/reading-continuity';
import ReaderLink from './ReaderLink';
import styles from './NextUp.module.css';

type Props = {
  /** The piece the reader just finished; every link reports onward reading from it. */
  piece: ReadingPiece;
  /** Up to two other pieces. The next part of a series is NextInSeries, not this. */
  recommendations?: readonly ReadingPiece[];
};

/** "More to read": up to two further pieces as cards with their kind and reading time. */
export default function NextUp({ piece, recommendations = [] }: Props) {
  if (recommendations.length === 0) return null;
  return (
    <section aria-labelledby="more-to-read-heading" className={styles.section}>
      <h2 id="more-to-read-heading" className={styles.heading}>More to read</h2>
      <ol className={styles.list}>
        {recommendations.map((recommendation) => {
          const minutes = readingMinutesLabel(recommendation.readingMinutes);
          const shared = {
            canonicalId: piece.canonicalPath,
            contentType: piece.contentType,
            placement: 'recommended-reading',
            href: canonicalDiscoveryHref(recommendation.canonicalPath),
          };
          return (
            <li key={recommendation.canonicalPath} className={styles.card}>
              <p className={styles.kind}>{recommendationKind(recommendation.contentType)}</p>
              <h3 className={styles.title}><ReaderLink {...shared}>{recommendation.title}</ReaderLink></h3>
              {minutes ? <p className={styles.meta}>{minutes}</p> : null}
              <ReaderLink {...shared} className={styles.read}>Read {recommendation.title} <span aria-hidden="true">→</span></ReaderLink>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
