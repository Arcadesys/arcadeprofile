/**
 * Pure helpers for the PieceBar: reading progress over a piece's article and
 * the strings the bar shows. No DOM access here so the maths stay testable.
 */

export interface PieceProgressInput {
  /** Article top edge in document coordinates (`rect.top + scrollY`). */
  articleTop: number;
  /** Article height in px. */
  articleHeight: number;
  /** Viewport height in px. */
  viewportHeight: number;
  /** Current vertical scroll offset in px. */
  scrollY: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Reading progress, 0 to 1.
 *
 * 0 means the article's top edge is at the top of the viewport (or below it).
 * 1 means the article's bottom edge is at the bottom of the viewport (or above
 * it). Between the two it is linear in scroll distance.
 *
 * Edge cases:
 * - An article with no measurable height (0, negative, NaN) is 0: nothing to read.
 * - An article no taller than the viewport cannot have both edges aligned. It
 *   counts as finished once its end is in view (bottom edge at or above the
 *   bottom of the viewport), otherwise 0.
 */
export function computePieceProgress(input: PieceProgressInput): number {
  const { articleTop, articleHeight, viewportHeight, scrollY } = input;
  if (![articleTop, articleHeight, viewportHeight, scrollY].every(Number.isFinite)) return 0;
  if (articleHeight <= 0) return 0;

  const span = articleHeight - Math.max(0, viewportHeight);
  if (span <= 0) return scrollY >= articleTop + span ? 1 : 0;
  return clamp01((scrollY - articleTop) / span);
}

/** Whole percent (0 to 100) for `aria-valuenow`. */
export function progressPercent(progress: number): number {
  return Math.round(clamp01(progress) * 100);
}

/**
 * "Part 04 / 20". Numbers are zero padded to two digits. Without a valid total
 * (or when the total is smaller than the part) only the part is shown. Returns
 * null when there is no valid part number, i.e. the piece is not in a series.
 */
export function formatPartLabel(position?: number, total?: number): string | null {
  if (position === undefined || !Number.isInteger(position) || position < 1) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (total !== undefined && Number.isInteger(total) && total >= position) {
    return `Part ${pad(position)} / ${pad(total)}`;
  }
  return `Part ${pad(position)}`;
}

/**
 * "6 min left" from the estimated reading minutes and progress (0 to 1).
 * Never below 1 minute until the piece is done, then "Finished". Returns null
 * when the estimate is unknown and the piece is not finished.
 */
export function formatTimeLeft(readingMinutes: number | undefined, progress: number): string | null {
  const done = clamp01(progress) >= 1;
  if (done) return 'Finished';
  if (readingMinutes === undefined || !Number.isFinite(readingMinutes) || readingMinutes <= 0) return null;
  // Round away float noise (10 * 0.7 = 7.000000000000001) before the ceiling.
  const left = Math.ceil(Number((readingMinutes * (1 - clamp01(progress))).toFixed(6)));
  return `${Math.max(1, left)} min left`;
}

/** Right-hand text of the bar: "Part 04 / 20 · 6 min left", omitting what is unknown. */
export function formatPieceStatus(args: {
  position?: number;
  total?: number;
  readingMinutes?: number;
  progress: number;
}): string {
  return [formatPartLabel(args.position, args.total), formatTimeLeft(args.readingMinutes, args.progress)]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}
