import type { ReadingContentType, ReadingPiece } from './reading-continuity';

/** Essays read as "essay"; fiction and chapters read as "fiction". */
export function recommendationKind(contentType: ReadingContentType): 'essay' | 'fiction' {
  return contentType === 'essay' ? 'essay' : 'fiction';
}

/** "About 8 min read", or null when the length is unknown. */
export function readingMinutesLabel(minutes: number | undefined): string | null {
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? `About ${minutes} min read` : null;
}
