import { NextResponse } from 'next/server';
import { runDueWelcomeSeries, welcomeSeriesEnabled } from '@/lib/welcome-series';

export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!welcomeSeriesEnabled()) return NextResponse.json({ ok: true, enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
  try { return NextResponse.json({ ok: true, ...await runDueWelcomeSeries({ apiKey: process.env.RESEND_CONTACTS_API_KEY?.trim() ?? '' }) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Welcome queue is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
