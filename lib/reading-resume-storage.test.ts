import assert from 'node:assert/strict';
import test from 'node:test';
import { LEGACY_READING_PROGRESS_STORAGE_KEY, READING_CONTINUITY_STORAGE_KEY } from './reading-continuity';
import { dismissStoredProgress, readStoredProgress } from './reading-resume-storage';

test('a valid legacy record is returned on its first render after promotion', () => {
  const values = new Map<string, string>([[LEGACY_READING_PROGRESS_STORAGE_KEY, JSON.stringify({ groupSlug: 'essays', groupTitle: 'Essays', postSlug: 'hello', postTitle: 'Hello', partIndex: 1, totalParts: 1, visitedAt: 100 })]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const result = readStoredProgress(storage, ['/projects/essays/hello'], 101);
  assert.equal(result?.canonicalPath, '/projects/essays/hello');
  assert.ok(values.has(READING_CONTINUITY_STORAGE_KEY));
  assert.equal(values.has(LEGACY_READING_PROGRESS_STORAGE_KEY), false);
});

test('dismissing progress clears both current and legacy keys', () => {
  const values = new Map<string, string>([[READING_CONTINUITY_STORAGE_KEY, '{}'], [LEGACY_READING_PROGRESS_STORAGE_KEY, '{}']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  dismissStoredProgress(storage);
  assert.equal(values.has(READING_CONTINUITY_STORAGE_KEY), false);
  assert.equal(values.has(LEGACY_READING_PROGRESS_STORAGE_KEY), false);
});
