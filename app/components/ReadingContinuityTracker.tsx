'use client';

import { useEffect } from 'react';
import { recordForPiece, READING_CONTINUITY_STORAGE_KEY, type ReadingPiece } from '@/lib/reading-continuity';

export default function ReadingContinuityTracker({ piece }: { piece: ReadingPiece }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(READING_CONTINUITY_STORAGE_KEY, JSON.stringify(recordForPiece(piece)));
    } catch {
      // Browsers may deny storage; reading remains fully usable without it.
    }
  }, [piece]);
  return null;
}
