import { NextResponse } from 'next/server';
import { getDuePosts, updateHistoryEntry } from '@/lib/social';
import { postToBluesky, atUriToWebUrl } from '@/lib/bluesky';

/**
 * Process scheduled social posts that are due.
 * Call this on a cron or manually to fire queued posts.
 */
export async function POST() {
  const due = getDuePosts();

  if (due.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results = [];

  for (const entry of due) {
    try {
      if (entry.platform === 'bluesky') {
        const result = await postToBluesky(entry.text, entry.linkUrl);
        const postUrl = atUriToWebUrl(result.uri);
        updateHistoryEntry(entry.id, {
          status: 'posted',
          postedAt: new Date().toISOString(),
          postUri: result.uri,
          postUrl,
        });
        results.push({ id: entry.id, status: 'posted', postUrl });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateHistoryEntry(entry.id, {
        status: 'failed',
        failedAt: new Date().toISOString(),
        failureReason: message,
      });
      results.push({ id: entry.id, status: 'failed', error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
