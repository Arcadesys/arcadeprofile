import { config } from 'dotenv';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { kitListUrl, makeKitExportSnapshot, normalizeKitSubscriber } from '../lib/kit-export';

const gitMeta = statSync('.git', { throwIfNoEntry: false });
if (!gitMeta?.isDirectory() || execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() !== 'main') throw new Error('Run Kit export only from the owner main checkout on main');

config({ path: '.env.kit.local', override: true });
const apiKey = process.env.KIT_API_KEY?.trim();
if (!apiKey) throw new Error('KIT_API_KEY is required in .env.kit.local');

async function get(url: URL) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { 'X-Kit-Api-Key': apiKey! }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
    if (response.status === 429) { await new Promise((resolve) => setTimeout(resolve, Math.max(1000, Number(response.headers.get('retry-after') ?? 1) * 1000))); continue; }
    if (!response.ok) throw new Error('Kit export GET failed');
    return await response.json() as Record<string, unknown>;
  }
  throw new Error('Kit export rate limit did not clear');
}
async function pages(kind: 'subscribers' | 'broadcasts') {
  const result: Record<string, unknown>[] = []; let after = '';
  for (let page = 0; page < 1000; page += 1) {
    const url = kitListUrl(kind, after);
    const data = await get(url); const rows = data[kind];
    if (!Array.isArray(rows)) throw new Error(`Invalid Kit ${kind} page`);
    result.push(...rows as Record<string, unknown>[]);
    const pagination = data.pagination as Record<string, unknown> | undefined;
    const next = pagination?.end_cursor ?? pagination?.next_cursor;
    if (pagination?.has_next !== true && !next) break;
    if (typeof next !== 'string' || !next || next === after) throw new Error(`Invalid Kit ${kind} cursor`);
    after = next;
  }
  return result;
}
const [subscribers, broadcasts] = await Promise.all([pages('subscribers'), pages('broadcasts')]);
const rows = subscribers.map((subscriber) => normalizeKitSubscriber(subscriber));
const snapshot = makeKitExportSnapshot(rows,
  broadcasts.map((b) => ({ subject: String(b.subject ?? ''), status: String(b.status ?? ''), send_date: String(b.send_at ?? b.published_at ?? ''), recipients: Number((b.stats as Record<string, unknown> | undefined)?.recipients ?? b.recipients_count ?? 0) })));
const output = process.argv[2] ?? path.join(os.tmpdir(), 'thearcades-kit-export.json');
if (path.resolve(output).startsWith(`${process.cwd()}${path.sep}`)) throw new Error('Snapshot must be outside the repository');
mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 }); writeFileSync(output, `${JSON.stringify(snapshot)}\n`, { mode: 0o600, flag: 'wx' });
const counts: Record<string, number> = {}; for (const row of rows) counts[row.state] = (counts[row.state] ?? 0) + 1;
console.log(JSON.stringify({ subscribers: counts, tagged_subscribers: snapshot.export_scope.tagged_subscriber_count, active_tagged_subscribers: snapshot.export_scope.active_tagged_subscriber_count, broadcasts: broadcasts.length }));
