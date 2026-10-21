import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RESEND_TOPICS } from '../lib/subscription-audiences';
import { applyResendImportRow, planResendImport } from '../lib/resend-import-plan';

const gitMeta = statSync('.git', { throwIfNoEntry: false });
if (!gitMeta?.isDirectory() || execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() !== 'main') throw new Error('Run Resend import only from the owner main checkout on main');

config({ path: '.env.resend.local', override: true });
config({ path: '.env.resend.topics' });
const resendKey = process.env.RESEND_CONTACTS_API_KEY?.trim();
const args = process.argv.slice(2); const value = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const snapshotPath = value('--snapshot'); const apply = args.includes('--apply'); const sync = args.includes('--sync-unsubscribes');
if (!snapshotPath || !existsSync(snapshotPath)) throw new Error('--snapshot must name a Kit export snapshot');
if ((apply || sync) && !resendKey) throw new Error('RESEND_CONTACTS_API_KEY is required in .env.resend.local');
const subscribedSegmentId = process.env.RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID?.trim() ?? '';
if ((apply || sync) && !/^[a-f0-9-]{20,64}$/i.test(subscribedSegmentId)) throw new Error('RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID is required in .env.resend.local');
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as { subscribers?: Array<{ email: string; state: string; topics: string[]; created_at: string }> };
if (!Array.isArray(snapshot.subscribers)) throw new Error('Snapshot is invalid');
const topicEnv: Record<string, string> = Object.fromEntries(RESEND_TOPICS.map(({ audience, env }) => [audience, env]));
let lastResendRequest = 0;
async function api(url: string, method = 'GET', payload?: unknown) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const wait = Math.max(0, 100 - (Date.now() - lastResendRequest));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastResendRequest = Date.now();
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: AbortSignal.timeout(20000) });
    if (response.status === 429) { const retry = Number(response.headers.get('retry-after') ?? 2); await new Promise((resolve) => setTimeout(resolve, Math.max(1000, retry * 1000))); continue; }
    if (!response.ok && response.status !== 404 && !(method === 'POST' && url.includes('/segments/') && response.status === 409)) throw new Error('Resend import request failed');
    if (response.status === 409 && method === 'POST' && url.includes('/segments/')) return {};
    return response.status === 404 ? null : await response.json() as Record<string, unknown>;
  }
  throw new Error('Resend import rate limit did not clear');
}
async function currentKitStates() {
  config({ path: '.env.kit.local', override: true }); const kitKey = process.env.KIT_API_KEY?.trim();
  if (!kitKey) throw new Error('KIT_API_KEY is required in .env.kit.local for unsubscribe sync');
  const map = new Map<string, string>(); let after = '';
  for (let page = 0; page < 1000; page += 1) {
    const url = new URL('https://api.kit.com/v4/subscribers'); url.searchParams.set('per_page', '100'); if (after) url.searchParams.set('after', after);
    const response = await fetch(url, { headers: { 'X-Kit-Api-Key': kitKey }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
    if (response.status === 429) { await new Promise((resolve) => setTimeout(resolve, Math.max(1000, Number(response.headers.get('retry-after') ?? 2) * 1000))); page -= 1; continue; }
    if (!response.ok) throw new Error('Kit unsubscribe sync GET failed');
    const data = await response.json() as { subscribers?: Array<{ email_address?: string; state?: string }>; pagination?: { has_next?: boolean; end_cursor?: string } };
    if (!Array.isArray(data.subscribers)) throw new Error('Kit unsubscribe sync response was invalid');
    for (const row of data.subscribers) if (row.email_address && row.state) map.set(row.email_address.toLowerCase(), row.state);
    if (!data.pagination?.has_next) break; if (!data.pagination.end_cursor || data.pagination.end_cursor === after) throw new Error('Kit pagination cursor was invalid'); after = data.pagination.end_cursor;
  }
  return map;
}

console.log(JSON.stringify(planResendImport(snapshot.subscribers)));
if (sync) {
  const kit = await currentKitStates(); let updated = 0;
  for (const row of snapshot.subscribers!) {
    const state = kit.get(row.email.toLowerCase()); if (!state || !['cancelled','bounced','complained'].includes(state)) continue;
    const found = await api(`https://api.resend.com/contacts/${encodeURIComponent(row.email.toLowerCase())}`);
    if (!found) continue; const c = (found.contact ?? found) as Record<string, unknown>; if (c.id) {
      await api(`https://api.resend.com/contacts/${encodeURIComponent(String(c.id))}`, 'PATCH', { unsubscribed: true });
      await api(`https://api.resend.com/contacts/${encodeURIComponent(String(c.id))}/segments/${encodeURIComponent(subscribedSegmentId)}`, 'DELETE');
      updated += 1;
    }
  }
  console.log(JSON.stringify({ sync_unsubscribes_updated: updated }));
} else if (apply) {
  const checkpoint = `${path.resolve(snapshotPath)}.resend-import-progress`; const saved = existsSync(checkpoint) ? Number(readFileSync(checkpoint, 'utf8')) : 0;
  const topicIds = Object.fromEntries(Object.entries(topicEnv).map(([topic, env]) => [topic, process.env[env]?.trim() ?? '']));
  if (Object.values(topicIds).some((id) => !id)) throw new Error('All RESEND_TOPIC_*_ID values are required');
  let subscribed = 0, suppressed = 0, skipped = 0;
  for (let index = Math.max(0, saved); index < snapshot.subscribers.length; index += 1) {
    const row = snapshot.subscribers[index];
    const result = await applyResendImportRow(row, topicIds, subscribedSegmentId, (url, method, payload) => api(url, method, payload));
    if (result === 'subscribed') subscribed += 1;
    else if (result === 'suppressed') suppressed += 1;
    else skipped += 1;
    writeFileSync(checkpoint, String(index + 1), { mode: 0o600 });
  }
  console.log(JSON.stringify({ subscribed, suppressed, skipped }));
} else if (args.some((a) => a.startsWith('--'))) throw new Error('Use --apply or --sync-unsubscribes explicitly; otherwise this is a dry run.');
