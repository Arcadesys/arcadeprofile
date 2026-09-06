import Link from 'next/link';
import { nextPiece, recommendedPieces, type ReadingPiece } from '@/lib/reading-continuity';

export default function ReadingNextSteps({ piece, catalog }: { piece: ReadingPiece; catalog: readonly ReadingPiece[] }) {
  const next = nextPiece(piece, catalog);
  const recommendations = next ? [] : recommendedPieces(piece, catalog);
  if (!next && recommendations.length === 0) return null;
  return (
    <section aria-label="Continue reading" style={{ margin: '2.5rem 0' }}>
      {next ? <Link href={next.canonicalPath} style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', fontSize: '1.1rem', color: 'var(--neon-pink)' }}>Next: {next.title} <span aria-hidden="true">→</span></Link> : (
        <><h2 style={{ fontSize: '1.25rem' }}>Keep reading</h2><ul>{recommendations.map((recommendation) => <li key={recommendation.canonicalPath}><Link href={recommendation.canonicalPath}>{recommendation.title}</Link></li>)}</ul></>
      )}
    </section>
  );
}
