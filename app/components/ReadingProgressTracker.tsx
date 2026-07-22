'use client';

import { useEffect } from 'react';

export const READING_PROGRESS_STORAGE_KEY = 'arcades:reading-progress';

export interface ReadingProgress {
  groupSlug: string;
  groupTitle: string;
  postSlug: string;
  postTitle: string;
  partIndex: number;
  totalParts: number;
  visitedAt: number;
}

interface ReadingProgressTrackerProps {
  groupSlug: string;
  groupTitle: string;
  postSlug: string;
  postTitle: string;
  partIndex: number;
  totalParts: number;
}

/**
 * Renders nothing — records the post being viewed as the most recent
 * reading-progress entry so `ContinueReadingBanner` can resume it later.
 * Skips the final chapter of a series (nothing left to "continue" to).
 */
export default function ReadingProgressTracker({
  groupSlug,
  groupTitle,
  postSlug,
  postTitle,
  partIndex,
  totalParts,
}: ReadingProgressTrackerProps) {
  useEffect(() => {
    if (partIndex >= totalParts) return;
    try {
      const entry: ReadingProgress = {
        groupSlug,
        groupTitle,
        postSlug,
        postTitle,
        partIndex,
        totalParts,
        visitedAt: Date.now(),
      };
      window.localStorage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — skip silently
    }
  }, [groupSlug, groupTitle, postSlug, postTitle, partIndex, totalParts]);

  return null;
}
