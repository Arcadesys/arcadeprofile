import { canonicalDiscoveryHref } from '@/lib/post-canonical';
import NextInSeries from './NextInSeries';
import ReaderLink from './ReaderLink';
import { nextPiece, recommendedPieces, type ReadingPiece } from '@/lib/reading-continuity';

type Props = {
  piece: ReadingPiece;
  catalog: readonly ReadingPiece[];
  /** The page already shows its own "Next in this series" card, so list only "More to read". */
  skipNext?: boolean;
};

export default function ReadingNextSteps({ piece, catalog, skipNext = false }: Props) {
  const next = skipNext ? null : nextPiece(piece, catalog);
  if (next && piece.collection) {
    return (
      <NextInSeries
        canonicalId={piece.canonicalPath}
        contentType={piece.contentType}
        seriesTitle={piece.collection.title}
        next={{ href: next.canonicalPath, title: next.title, partNumber: piece.collection.position + 1, totalParts: piece.collection.total }}
      />
    );
  }
  const recommendations = recommendedPieces(piece, catalog);
  if (recommendations.length === 0) return null;
  return (
    <section aria-labelledby="more-to-read-heading" style={{ margin: '2.5rem 0' }}>
      <h2 id="more-to-read-heading" style={{ fontSize: '1.5rem' }}>More to read</h2>
      <ul>{recommendations.map((recommendation) => <li key={recommendation.canonicalPath}><ReaderLink canonicalId={piece.canonicalPath} contentType={piece.contentType} placement="recommended-reading" href={canonicalDiscoveryHref(recommendation.canonicalPath)} style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', fontSize: '1.125rem' }}>{recommendation.title}</ReaderLink></li>)}</ul>
    </section>
  );
}
