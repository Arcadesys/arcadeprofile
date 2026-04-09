import { NextResponse } from 'next/server';
import { postToBluesky, atUriToWebUrl } from '@/lib/bluesky';
import { getPayload } from 'payload';
import config from '@payload-config';

/**
 * Process scheduled social posts that are due.
 * Call this on a cron or manually to fire queued posts.
 */
export async function POST() {
  const payload = await getPayload({ config });
  const now = new Date().toISOString();

  const result = await payload.find({
    collection: 'social-posts',
    where: {
      status: { equals: 'scheduled' },
      scheduledAt: { less_than_equal: now },
    },
  });

  const due = result.docs;

  if (due.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results = [];

  for (const entry of due) {
    try {
      if (entry.platform === 'bluesky') {
        const blueskyResult = await postToBluesky(entry.text, entry.linkUrl || undefined);
        const postUrl = atUriToWebUrl(blueskyResult.uri);
        await payload.update({
          collection: 'social-posts',
          id: entry.id,
          data: {
            status: 'posted',
            postedAt: new Date().toISOString(),
            postUri: blueskyResult.uri,
            postUrl,
          },
        });
        results.push({ id: entry.id, status: 'posted', postUrl });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await payload.update({
        collection: 'social-posts',
        id: entry.id,
        data: {
          status: 'failed',
          failedAt: new Date().toISOString(),
          failureReason: message,
        },
      });
      results.push({ id: entry.id, status: 'failed', error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
