import {
  LEGACY_READING_PROGRESS_STORAGE_KEY,
  migrateLegacyReadingProgress,
  parseReadingContinuity,
  READING_CONTINUITY_STORAGE_KEY,
  type ReadingContinuityRecord,
} from './reading-continuity';

export type ReadingStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Reads only routes currently supplied by the server, and atomically promotes valid legacy state. */
export function readStoredProgress(storage: ReadingStorage, availablePaths: readonly string[], now = Date.now()): ReadingContinuityRecord | null {
  const current = parseReadingContinuity(storage.getItem(READING_CONTINUITY_STORAGE_KEY), now);
  if (current && availablePaths.includes(current.canonicalPath)) return current;
  const legacy = migrateLegacyReadingProgress(storage.getItem(LEGACY_READING_PROGRESS_STORAGE_KEY), now);
  if (!legacy || !availablePaths.includes(legacy.canonicalPath)) return null;
  storage.setItem(READING_CONTINUITY_STORAGE_KEY, JSON.stringify(legacy));
  storage.removeItem(LEGACY_READING_PROGRESS_STORAGE_KEY);
  return legacy;
}
