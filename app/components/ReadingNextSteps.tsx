import ReaderLink from './ReaderLink';
import { nextPiece, recommendedPieces, type ReadingPiece } from '@/lib/reading-continuity';

export default function ReadingNextSteps({ piece, catalog }: { piece: ReadingPiece; catalog: readonly ReadingPiece[] }) {
  const next = nextPiece(piece, catalog);
  const recommendations = next ? [] : recommendedPieces(piece, catalog);
  if (!next && recommendations.length === 0) return null;
  return (
    <section aria-label="Continue reading" style={{ margin: '2.5rem 0' }}>
      {next ? <ReaderLink canonicalId={piece.canonicalPath} contentType={piece.contentType} placement="next-chapter" href={next.canonicalPath} style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', fontSize: '1.1rem', color: 'var(--neon-pink)' }}>Next: {next.title} <span aria-hidden="true">→</span></ReaderLink> : (
        <><h2 style={{ fontSize: '1.25rem' }}>Keep reading</h2><ul>{recommendations.map((recommendation) => <li key={recommendation.canonicalPath}><ReaderLink canonicalId={piece.canonicalPath} contentType={piece.contentType} placement="recommended-reading" href={recommendation.canonicalPath} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', fontSize: '0.875rem' }}>{recommendation.title}</ReaderLink></li>)}</ul></>
      )}
    </section>
  );
}
