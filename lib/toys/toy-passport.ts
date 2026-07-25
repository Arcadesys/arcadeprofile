import type { TwineVariables } from './twine-engine';

export const TOY_PASSPORT_STORAGE_KEY = 'arcadeprofile:toy-passport:v1';

export type ToyProgress = {
  currentPassageId: string;
  entryVariables: TwineVariables;
  visitedPassageIds: string[];
  endingIds: string[];
  atEnding: boolean;
  updatedAt: string;
};

export type ToyPassport = {
  version: 1;
  games: Record<string, ToyProgress>;
};

export const EMPTY_TOY_PASSPORT: ToyPassport = {
  version: 1,
  games: {},
};

function isVariables(value: unknown): value is TwineVariables {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.values(value).every(
    (entry) =>
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean',
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isToyProgress(value: unknown): value is ToyProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const candidate = value as Partial<ToyProgress>;
  return (
    typeof candidate.currentPassageId === 'string' &&
    isVariables(candidate.entryVariables) &&
    isStringArray(candidate.visitedPassageIds) &&
    isStringArray(candidate.endingIds) &&
    typeof candidate.atEnding === 'boolean' &&
    typeof candidate.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.updatedAt))
  );
}

export function parseToyPassport(raw: string | null): ToyPassport {
  if (!raw) return EMPTY_TOY_PASSPORT;

  try {
    const candidate = JSON.parse(raw) as Partial<ToyPassport>;
    if (
      candidate.version !== 1 ||
      !candidate.games ||
      typeof candidate.games !== 'object' ||
      Array.isArray(candidate.games)
    ) {
      return EMPTY_TOY_PASSPORT;
    }

    const games = Object.fromEntries(
      Object.entries(candidate.games).filter((entry): entry is [string, ToyProgress] =>
        isToyProgress(entry[1]),
      ),
    );

    return { version: 1, games };
  } catch {
    return EMPTY_TOY_PASSPORT;
  }
}

export function readToyPassport(): ToyPassport {
  if (typeof window === 'undefined') return EMPTY_TOY_PASSPORT;

  try {
    return parseToyPassport(
      window.localStorage.getItem(TOY_PASSPORT_STORAGE_KEY),
    );
  } catch {
    return EMPTY_TOY_PASSPORT;
  }
}

export function saveToyProgress(
  toyId: string,
  progress: ToyProgress,
): ToyPassport {
  const current = readToyPassport();
  const next: ToyPassport = {
    version: 1,
    games: { ...current.games, [toyId]: progress },
  };

  try {
    window.localStorage.setItem(TOY_PASSPORT_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('toy-passport-updated'));
  } catch {
    return current;
  }

  return next;
}

export function latestInProgressToy(
  passport: ToyPassport,
): [string, ToyProgress] | undefined {
  return Object.entries(passport.games)
    .filter(
      ([, progress]) =>
        !progress.atEnding && progress.visitedPassageIds.length > 1,
    )
    .sort(
      ([, left], [, right]) =>
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0];
}
