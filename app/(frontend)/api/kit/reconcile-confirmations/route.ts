import { timingSafeEqual } from 'node:crypto';

import { reconcileConfirmedKitSubscribers } from '@/lib/kit-confirmation-reconciliation';
import type { Audience } from '@/lib/subscribe-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUDIENCES: Audience[] = ['all', 'fiction', 'essays', 'lab'];
const TAG_ENV: Record<Audience, string> = {
  all: 'KIT_TAG_ALL_WRITING_ID',
  fiction: 'KIT_TAG_FICTION_ID',
  essays: 'KIT_TAG_ESSAYS_ID',
  lab: 'KIT_TAG_LAB_ID',
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

function authorized(request: Request, secret: string) {
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'not_configured' }, 503);
  if (!authorized(request, secret)) return json({ error: 'unauthorized' }, 401);
  if (process.env.KIT_RECONCILE_ENABLED !== 'true') {
    return json({ ok: true, skipped: true, reason: 'reconciliation_not_enabled' });
  }
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  const audiences = AUDIENCES.map((audience) => ({
    audience,
    formId: process.env[`KIT_FORM_${audience.toUpperCase()}_ID`] ?? '',
    tagId: process.env[TAG_ENV[audience]] ?? '',
  }));
  try {
    const result = await reconcileConfirmedKitSubscribers({ apiKey, audiences });
    return result.failed === 0
      ? json({ ok: true, ...result })
      : json({ ok: false, ...result }, 502);
  } catch {
    // Provider responses and subscriber data are intentionally excluded.
    return json({ error: 'reconciliation_failed' }, 502);
  }
}
