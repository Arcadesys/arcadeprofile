import { canonicalDiscoveryHref } from '@/lib/post-canonical';
import { nextUpKindLine, readingMinutesLabel, recommendationKind } from '@/lib/next-up';
import type { ReadingPiece } from '@/lib/reading-continuity';
import ReaderLink from './ReaderLink';
import styles from './NextUp.module.css';

type Props = {
  /** The piece the reader just finished; every link reports onward reading from it. */
  piece: ReadingPiece;
  /** The next part of the same collection. Wins over recommendations. */
  next?: ReadingPiece | null;
  /** Up to two other pieces, used only when there is no next part. */
  recommendations?: readonly ReadingPiece[];
};

function Anatomy({ piece, target, placement, href, kind, Heading }: {
  piece: ReadingPiece; target: ReadingPiece; placement: string; href: string; kind: string; Heading: 'h2' | 'h3';
}) {
  const minutes = readingMinutesLabel(target.readingMinutes);
  const shared = { canonicalId: piece.canonicalPath, contentType: piece.contentType, placement, href };
  return (
    <>
      <p className={styles.kind}>{kind}</p>
      <Heading className={styles.title}><ReaderLink {...shared}>{target.title}</ReaderLink></Heading>
      {minutes ? <p className={styles.meta}>{minutes}</p> : null}
      <ReaderLink {...shared} className={styles.read}>Read {target.title} <span aria-hidden="true">→</span></ReaderLink>
    </>
  );
}

/** The end-of-piece card: the next part by name, or two further pieces when the series is done. */
export default function NextUp({ piece, next, recommendations = [] }: Props) {
  if (next) {
    return (
      <section aria-label="Continue reading" className={styles.section}>
        <div className={styles.card}>
          <Anatomy piece={piece} target={next} placement="next-chapter" href={next.canonicalPath} kind={nextUpKindLine(next.collection)} Heading="h2" />
        </div>
      </section>
    );
  }
  if (recommendations.length === 0) return null;
  return (
    <section aria-label="Continue reading" className={styles.section}>
      <h2 className={styles.heading}>Where to go from here</h2>
      <ol className={styles.list}>
        {recommendations.map((recommendation) => (
          <li key={recommendation.canonicalPath} className={styles.card}>
            <Anatomy piece={piece} target={recommendation} placement="recommended-reading" href={canonicalDiscoveryHref(recommendation.canonicalPath)} kind={recommendationKind(recommendation.contentType)} Heading="h3" />
          </li>
        ))}
      </ol>
    </section>
  );
}
