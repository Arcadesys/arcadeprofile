import NextInSeries from './NextInSeries';
import NextUp from './NextUp';
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
  return <NextUp piece={piece} recommendations={recommendedPieces(piece, catalog)} />;
}
