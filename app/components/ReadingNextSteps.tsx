import { nextPiece, recommendedPieces, type ReadingPiece } from '@/lib/reading-continuity';
import NextUp from './NextUp';

export default function ReadingNextSteps({ piece, catalog }: { piece: ReadingPiece; catalog: readonly ReadingPiece[] }) {
  const next = nextPiece(piece, catalog);
  const recommendations = next ? [] : recommendedPieces(piece, catalog);
  return <NextUp piece={piece} next={next} recommendations={recommendations} />;
}
