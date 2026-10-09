export type EndOfPieceKind = 'story' | 'essay' | 'build note';

type EndOfPieceCopyInput = {
  kind: EndOfPieceKind;
  seriesTitle?: string;
  totalParts?: number;
  seriesActive?: boolean;
};

const ALL_WRITING_COPY = "Join All Writing for stories, essays, and build notes when they're ready.";

export function endOfPieceCopy({
  seriesTitle,
  totalParts,
  seriesActive = false,
}: EndOfPieceCopyInput): string {
  if (seriesActive && seriesTitle && totalParts && totalParts > 0) {
    const noun = totalParts === 1 ? 'installment' : 'installments';
    return `${seriesTitle} currently has ${totalParts} ${noun}. ${ALL_WRITING_COPY}`;
  }

  return ALL_WRITING_COPY;
}
