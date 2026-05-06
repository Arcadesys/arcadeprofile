import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { authorizeCronRequest, getScheduledPostsPerRun } from '@/lib/cronAuth';
import { publishScheduledPosts } from '@/lib/publishScheduled';

async function runPublish() {
  const payload = await getPayload({ config });
  const summary = await publishScheduledPosts(payload, {
    perRunLimit: getScheduledPostsPerRun(),
  });

  // Stuck posts are a *report*, not a run failure. Log loudly so we still
  // notice in the workflow output, but don't poison the HTTP status —
  // otherwise one stuck row makes every subsequent cron run look broken
  // (and silently masks the fact that other due posts published fine).
  if (summary.stuck > 0) {
    console.error(
      '[publish-scheduled] stuck posts detected',
      JSON.stringify({
        stuck: summary.stuck,
        stuckPosts: summary.stuckPosts,
        processed: summary.processed,
        failed: summary.failed,
      }),
    );
  }

  if (summary.failed > 0) {
    return NextResponse.json(summary, { status: 500 });
  }

  return NextResponse.json(summary);
}

async function handleRequest(request: Request) {
  const unauthorizedResponse = authorizeCronRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return runPublish();
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
