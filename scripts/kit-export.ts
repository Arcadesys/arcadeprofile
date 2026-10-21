import { config } from 'dotenv';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const gitMeta = statSync('.git', { throwIfNoEntry: false });
if (!gitMeta?.isDirectory() || execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() !== 'main') throw new Error('Run Kit export only from the owner main checkout on main');

config({ path: '.env.kit.local', override: true });
const apiKey = process.env.KIT_API_KEY?.trim();
if (!apiKey) throw new Error('KIT_API_KEY is required in .env.kit.local');

const topicTags: Record<string, string> = {
  '23851250': 'all', '23851251': 'fiction', '23851252': 'essays', '23851253': 'lab',
  '23866437': 'queer-columns', '23806915': 'work-ai', '23808390': 'th4f',
};
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
    const url = new URL(`https://api.kit.com/v4/${kind}`); url.searchParams.set('per_page', '100');
    if (after) url.searchParams.set('after', after);
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
function tagsOf(subscriber: Record<string, unknown>) {
  const tags = Array.isArray(subscriber.tags) ? subscriber.tags : [];
  return [...new Set(tags.flatMap((value) => {
    const tag = value as Record<string, unknown>; const id = String(tag.id ?? ''); const mapped = topicTags[id];
    if (mapped) return [mapped];
    const name = String(tag.name ?? '').toLowerCase();
    const map: Record<string, string> = { 'arcadeprofile: all writing': 'all', 'arcadeprofile: fiction': 'fiction', 'arcadeprofile: essays': 'essays', 'arcadeprofile: lab': 'lab', 'arcadeprofile: queer columns': 'queer-columns', 'arcadeprofile: work / ai': 'work-ai', 'arcadeprofile: th4f': 'th4f' };
    return map[name] ? [map[name]] : [];
  }))];
}
const [subscribers, broadcasts] = await Promise.all([pages('subscribers'), pages('broadcasts')]);
const rows = subscribers.map((s) => ({ email: String(s.email_address ?? ''), state: String(s.state ?? ''), topics: tagsOf(s), created_at: String(s.created_at ?? '') }));
if (rows.some((r) => !r.email || !r.state)) throw new Error('Kit export contained an invalid subscriber row');
const snapshot = { version: 1, exported_at: new Date().toISOString(), subscribers: rows,
  broadcasts: broadcasts.map((b) => ({ subject: String(b.subject ?? ''), status: String(b.status ?? ''), send_date: String(b.send_at ?? b.published_at ?? ''), recipients: Number((b.stats as Record<string, unknown> | undefined)?.recipients ?? b.recipients_count ?? 0) })) };
const output = process.argv[2] ?? path.join(os.tmpdir(), 'thearcades-kit-export.json');
if (path.resolve(output).startsWith(`${process.cwd()}${path.sep}`)) throw new Error('Snapshot must be outside the repository');
mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 }); writeFileSync(output, `${JSON.stringify(snapshot)}\n`, { mode: 0o600, flag: 'wx' });
const counts: Record<string, number> = {}; for (const row of rows) counts[row.state] = (counts[row.state] ?? 0) + 1;
console.log(JSON.stringify({ subscribers: counts, broadcasts: broadcasts.length }));
