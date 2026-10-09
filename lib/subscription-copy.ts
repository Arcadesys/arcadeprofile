export type EndOfPieceKind = 'story' | 'essay' | 'build note';

type EndOfPieceCopyInput = {
  kind: EndOfPieceKind;
  seriesTitle?: string;
  totalParts?: number;
  seriesActive?: boolean;
};

export function endOfPieceCopy({
  kind,
  seriesTitle,
  totalParts,
  seriesActive = false,
}: EndOfPieceCopyInput): string {
  if (seriesActive && seriesTitle && totalParts && totalParts > 0) {
    const noun = totalParts === 1 ? 'installment' : 'installments';
    return `${seriesTitle} currently has ${totalParts} ${noun}. Get the next one in your inbox as it lands.`;
  }

  if (seriesTitle) {
    const pluralKind = kind === 'story' ? 'stories' : kind === 'essay' ? 'essays' : 'build notes';
    return `Follow ${seriesTitle} for new ${pluralKind}.`;
  }

  return `Get the next ${kind} in your inbox as it arrives.`;
}
