import { timingSafeEqual } from 'node:crypto';

import { reconcileVerifiedKitSignups } from '@/lib/kit-confirmation-reconciliation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const apiKey = process.env.KIT_API_KEY;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!apiKey || !redisUrl || !redisToken) return json({ error: 'not_configured' }, 503);
  try {
    const result = await reconcileVerifiedKitSignups({ apiKey });
    return result.failed === 0
      ? json({ ok: true, ...result })
      : json({ ok: false, ...result }, 502);
  } catch {
    // Provider responses and subscriber data are intentionally excluded.
    return json({ error: 'reconciliation_failed' }, 502);
  }
}
