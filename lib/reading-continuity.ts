export const READING_CONTINUITY_STORAGE_KEY = 'arcades:reading-continuity';
export const LEGACY_READING_PROGRESS_STORAGE_KEY = 'arcades:reading-progress';
export const READING_CONTINUITY_VERSION = 2;
export const READING_CONTINUITY_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 120;

export type ReadingContentType = 'essay' | 'fiction' | 'chapter';
export type CollectionStatus = 'active' | 'complete';

export type ReadingPiece = {
  canonicalPath: string;
  title: string;
  contentType: ReadingContentType;
  collection?: {
    id: string;
    title: string;
    path: string;
    position: number;
    total: number;
    status: CollectionStatus;
  };
  tags?: readonly string[];
  publishedAt?: string;
  /** Paths selected by the editor. They always outrank automatic matches. */
  curatedRelatedPaths?: readonly string[];
  /** Identifies another published edition of the same work. */
  editionOf?: string;
};

export type ReadingContinuityRecord = {
  version: typeof READING_CONTINUITY_VERSION;
  canonicalPath: string;
  title: string;
  collection?: ReadingPiece['collection'];
  position?: number;
  timestamp: number;
};

type LegacyReadingProgress = {
  groupSlug?: unknown;
  groupTitle?: unknown;
  postSlug?: unknown;
  postTitle?: unknown;
  partIndex?: unknown;
  totalParts?: unknown;
  visitedAt?: unknown;
};

function isSafePath(value: unknown): value is string {
  return typeof value === 'string' && /^\/[a-z0-9/_-]*$/i.test(value) && !value.includes('//');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function validCollection(value: unknown): ReadingPiece['collection'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const position = item.position;
  const total = item.total;
  if (typeof item.id !== 'string' || typeof item.title !== 'string' || !isSafePath(item.path)
    || !isPositiveInteger(position) || !isPositiveInteger(total)
    || total < position
    || (item.status !== 'active' && item.status !== 'complete')) return undefined;
  return item as ReadingPiece['collection'];
}

export function recordForPiece(piece: ReadingPiece, timestamp = Date.now()): ReadingContinuityRecord {
  return {
    version: READING_CONTINUITY_VERSION,
    canonicalPath: piece.canonicalPath,
    title: piece.title,
    collection: piece.collection,
    position: piece.collection?.position,
    timestamp,
  };
}

export function parseReadingContinuity(raw: string | null, now = Date.now()): ReadingContinuityRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version !== READING_CONTINUITY_VERSION || !isSafePath(value.canonicalPath)
      || typeof value.title !== 'string' || !value.title.trim() || !isFiniteNumber(value.timestamp)
      || value.timestamp > now + 60_000 || now - value.timestamp > READING_CONTINUITY_MAX_AGE_MS) return null;
    const collection = value.collection === undefined ? undefined : validCollection(value.collection);
    if (value.collection !== undefined && !collection) return null;
    return { version: READING_CONTINUITY_VERSION, canonicalPath: value.canonicalPath, title: value.title, collection, position: collection?.position, timestamp: value.timestamp };
  } catch {
    return null;
  }
}

/** Converts only the previous project-post record; unknown legacy data is discarded. */
export function migrateLegacyReadingProgress(raw: string | null): ReadingContinuityRecord | null {
  if (!raw) return null;
  try {
    const old = JSON.parse(raw) as LegacyReadingProgress;
    const partIndex = old.partIndex;
    const totalParts = old.totalParts;
    const visitedAt = old.visitedAt;
    if (typeof old.groupSlug !== 'string' || typeof old.postSlug !== 'string' || typeof old.groupTitle !== 'string'
      || typeof old.postTitle !== 'string' || !isPositiveInteger(partIndex) || !isPositiveInteger(totalParts)
      || totalParts < partIndex || !isFiniteNumber(visitedAt)) return null;
    return {
      version: READING_CONTINUITY_VERSION,
      canonicalPath: `/projects/${old.groupSlug}/${old.postSlug}`,
      title: old.postTitle,
      collection: { id: `project:${old.groupSlug}`, title: old.groupTitle, path: `/projects/${old.groupSlug}`, position: partIndex, total: totalParts, status: 'complete' },
      position: partIndex,
      timestamp: visitedAt,
    };
  } catch {
    return null;
  }
}

export function nextPiece(piece: ReadingPiece, catalog: readonly ReadingPiece[]): ReadingPiece | null {
  const collection = piece.collection;
  if (!collection || collection.position >= collection.total) return null;
  return catalog.find((candidate) => candidate.collection?.id === collection.id
    && candidate.collection.total === collection.total
    && candidate.collection.position === collection.position + 1) ?? null;
}

/** Editor-curated links, then tag matches, then newest matching content type. */
export function recommendedPieces(piece: ReadingPiece, catalog: readonly ReadingPiece[], limit = 2): ReadingPiece[] {
  const byPath = new Map(catalog.map((candidate) => [candidate.canonicalPath, candidate]));
  const seen = new Set<string>([piece.canonicalPath]);
  const excludedEdition = piece.editionOf;
  const allowed = (candidate: ReadingPiece | undefined): candidate is ReadingPiece => candidate !== undefined
    && !seen.has(candidate.canonicalPath)
    && (!excludedEdition || candidate.editionOf !== excludedEdition);
  const picked: ReadingPiece[] = [];
  const add = (candidate: ReadingPiece | undefined) => {
    if (!candidate || !allowed(candidate) || picked.length >= limit) return;
    const selected = candidate;
    seen.add(selected.canonicalPath);
    picked.push(selected);
  };
  for (const path of piece.curatedRelatedPaths ?? []) add(byPath.get(path));
  const tags = new Set(piece.tags ?? []);
  const dated = (candidate: ReadingPiece) => Date.parse(candidate.publishedAt ?? '') || 0;
  const candidates = catalog.filter(allowed).sort((a, b) => {
    const overlapA = (a.tags ?? []).filter((tag) => tags.has(tag)).length;
    const overlapB = (b.tags ?? []).filter((tag) => tags.has(tag)).length;
    if (overlapA !== overlapB) return overlapB - overlapA;
    return dated(b) - dated(a);
  });
  for (const candidate of candidates.filter((candidate) => (candidate.tags ?? []).some((tag) => tags.has(tag)))) add(candidate);
  for (const candidate of candidates.filter((candidate) => candidate.contentType === piece.contentType).sort((a, b) => dated(b) - dated(a))) add(candidate);
  return picked;
}
