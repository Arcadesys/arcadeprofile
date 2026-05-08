import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { authorizeCronRequest } from '@/lib/cronAuth';
import { logger } from '@/lib/logger';
import { runWeeklyRoundup } from '@/lib/run-weekly-roundup';

async function runRoundup() {
  const payload = await getPayload({ config });
  const summary = await runWeeklyRoundup(payload);

  for (const stream of summary.streams) {
    if (!stream.fanOut) continue;
    for (const failure of stream.fanOut.failures) {
      const detail = (failure.error as { details?: string })?.details;
      const status = (failure.error as { causeStatus?: number })?.causeStatus;
      logger.error(
        {
          stream: stream.stream,
          audience: failure.audience,
          status,
          detail,
          err: failure.error,
        },
        '[weekly-roundup] AC fan-out failure',
      );
    }
  }

  if (!summary.allSucceeded) {
    return NextResponse.json(summary, { status: 500 });
  }
  return NextResponse.json(summary);
}

async function handleRequest(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;
  return runRoundup();
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
