import { NextResponse } from 'next/server';

const CRON_AUTH_HEADER = 'authorization';

export function authorizeCronRequest(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured.' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get(CRON_AUTH_HEADER);

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

export function getScheduledPostsPerRun(): number | null {
  const rawValue = process.env.SCHEDULED_POSTS_PER_RUN;

  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
