import { config } from 'dotenv';
import { chmodSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { RESEND_TOPICS } from '../lib/subscription-audiences';
import { ensureResendTopics } from '../lib/resend-topics';

const gitMeta = statSync('.git', { throwIfNoEntry: false });
if (!gitMeta?.isDirectory() || execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() !== 'main') throw new Error('Run Resend topic setup only from the owner main checkout on main');
config({ path: '.env.resend.local', override: true });
const apiKey = process.env.RESEND_CONTACTS_API_KEY?.trim();
if (!apiKey) throw new Error('RESEND_CONTACTS_API_KEY is required in .env.resend.local (Full access)');

async function api(input: RequestInfo | URL, init?: RequestInit) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const wait = Math.max(0, 100 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const response = await fetch(input, init);
    if (response.status === 429) { const retry = Number(response.headers.get('retry-after') ?? 2); await new Promise((resolve) => setTimeout(resolve, Math.max(1000, retry * 1000))); continue; }
    return response;
  }
  throw new Error('Resend rate limit did not clear');
}

let lastRequestAt = 0;
const topics = await ensureResendTopics(apiKey, api);
const output = RESEND_TOPICS.map(({ env }) => `${env}=${topics[env]}`).join('\n') + '\n';
writeFileSync('.env.resend.topics', output, { mode: 0o600 });
chmodSync('.env.resend.topics', 0o600);
console.log(JSON.stringify({ ensured_topics: RESEND_TOPICS.length, topic_ids_written: Object.keys(topics).length }));
