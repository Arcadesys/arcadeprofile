import type { ReadingContentType, ReadingPiece } from './reading-continuity';

/** "Next in The Singularity Log · Part 05 / 20", or "Next up" outside a collection. */
export function nextUpKindLine(collection?: Pick<NonNullable<ReadingPiece['collection']>, 'title' | 'position' | 'total'>): string {
  if (!collection) return 'Next up';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Next in ${collection.title} · Part ${pad(collection.position)} / ${pad(collection.total)}`;
}

/** Essays read as "essay"; fiction and chapters read as "fiction". */
export function recommendationKind(contentType: ReadingContentType): 'essay' | 'fiction' {
  return contentType === 'essay' ? 'essay' : 'fiction';
}

/** "About 8 min read", or null when the length is unknown. */
export function readingMinutesLabel(minutes: number | undefined): string | null {
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? `About ${minutes} min read` : null;
}
