import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test, type TestContext } from 'node:test';

const script = fileURLToPath(new URL('./newsletter-post.ts', import.meta.url));
const tsx = import.meta.resolve('tsx');
const slug = 'fixture-essay';
const broadcastId = '550e8400-e29b-41d4-a716-446655440000';
const segmentId = '550e8400-e29b-41d4-a716-446655440001';
const topicId = '550e8400-e29b-41d4-a716-446655440002';

const mockFetch = `
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
globalThis.fetch = async (url, init) => {
  const address = String(url); const method = init?.method ?? 'GET'; const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const authorization = new Headers(init?.headers).get('Authorization');
  appendFileSync('calls.jsonl', JSON.stringify({ url: address, method, body }) + '\\n');
  if (address === 'https://example.invalid/projects/arcade-blog/fixture-essay') return new Response('Fixture', { status: process.env.MOCK_MODE === 'unpublished' ? 404 : 200 });
  if (address === 'https://api.resend.com/emails') { assert.equal(authorization, 'Bearer ' + process.env.RESEND_API_KEY); assert.deepEqual(body.to, ['preview@example.invalid']); return Response.json({ id: 'fixture-preview' }); }
  if (address === 'https://api.resend.com/broadcasts') {
    assert.equal(authorization, 'Bearer ' + process.env.RESEND_CONTACTS_API_KEY);
    const receipt = JSON.parse(readFileSync('data/newsletter-sends/fixture-essay.resend.json', 'utf8'));
    assert.equal(receipt.attempts.at(-1).status, 'pending');
    assert.equal(existsSync('data/newsletter-sends/fixture-essay.resend.json.lock'), true);
    assert.equal(method, 'POST');
    writeFileSync('provider-entered', 'yes');
    if (process.env.MOCK_MODE === 'create-fail') return new Response('failed', { status: 503 });
    return Response.json({ id: process.env.BAD_ID === 'yes' ? 'bad' : process.env.BROADCAST_ID }, { status: 201 });
  }
  if (address === 'https://api.resend.com/broadcasts/' + process.env.BROADCAST_ID + '/send') {
    assert.deepEqual(body, { scheduled_at: body.scheduled_at });
    if (process.env.MOCK_MODE === 'send-fail') return new Response('failed', { status: 503 });
    return Response.json({ id: process.env.BROADCAST_ID });
  }
  throw new Error('Unexpected mocked URL: ' + address);
};
`;

type Call = { url: string; method: string; body?: Record<string, unknown> };
type Result = { code: number | null; signal: NodeJS.Signals | null; output: string };
function fixture(t: TestContext) {
  const root = mkdtempSync(path.join(tmpdir(), 'newsletter-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const group = path.join(root, 'content/posts/arcade-blog'); mkdirSync(group, { recursive: true });
  writeFileSync(path.join(group, '_group.json'), JSON.stringify({ slug: 'arcade-blog', title: 'Fixture essays' }));
  writeFileSync(path.join(group, `${slug}.md`), `---\nid: fixture-essay\ntitle: Fixture essay\nslug: ${slug}\ngroup: arcade-blog\npublishDate: "2020-01-01T00:00:00Z"\n---\nA fixture essay.\n`);
  const preload = path.join(root, 'mock-fetch.mjs'); writeFileSync(preload, mockFetch);
  const receipt = path.join(root, `data/newsletter-sends/${slug}.resend.json`);
  const calls = () => existsSync(path.join(root, 'calls.jsonl')) ? readFileSync(path.join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line) as Call) : [];
  const start = (args: string[] = ['--send'], mode = 'success', env: Record<string, string> = {}) => {
    const child = spawn(process.execPath, ['--import', tsx, '--import', pathToFileURL(preload).href, script, '--slug', slug, ...args], { cwd: root,
      env: { PATH: process.env.PATH, NODE_ENV: 'test', NEXT_PUBLIC_SITE_URL: 'https://example.invalid', RESEND_API_KEY: 'fixture-send-key', RESEND_CONTACTS_API_KEY: 'fixture-full-key', RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID: segmentId, RESEND_TOPIC_ESSAYS_ID: topicId,
        RESEND_FROM_EMAIL: 'sender@mail.example.invalid', RESEND_FROM_NAME: 'Austen', BROADCAST_ID: broadcastId, MOCK_MODE: mode, ...env } });
    t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); }); let output = '';
    child.stdout.on('data', (data) => { output += data; }); child.stderr.on('data', (data) => { output += data; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 15000);
    const result = new Promise<Result>((resolve, reject) => { child.once('error', (error) => { clearTimeout(timer); reject(error); }); child.once('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, output }); }); });
    return { child, result };
  };
  const seed = (data: unknown, extension = '.resend.json') => { mkdirSync(path.dirname(receipt), { recursive: true }); writeFileSync(path.join(path.dirname(receipt), `${slug}${extension}`), JSON.stringify(data)); };
  return { root, receipt, calls, start, seed };
}
function sends(calls: Call[]) { return calls.filter((call) => call.url.includes('/broadcasts')); }

test('dry run is read-only; explicit preview uses the sending-only key', async (t) => {
  const f = fixture(t); const dry = await f.start([]).result;
  assert.equal(dry.code, 0, dry.output); assert.match(dry.output, /"mode": "dry-run"/); assert.deepEqual(f.calls(), []); assert.equal(existsSync(f.receipt), false);
  const preview = await f.start(['--preview-to', 'preview@example.invalid'], 'success', { RESEND_API_KEY: 'fixture-send-only' }).result;
  assert.equal(preview.code, 0, preview.output); assert.equal(f.calls().length, 1); assert.equal(f.calls()[0].url, 'https://api.resend.com/emails');
});

test('send creates a draft then schedules it, with a non-PII duplicate guard', async (t) => {
  const f = fixture(t); const sent = await f.start().result;
  assert.equal(sent.code, 0, sent.output); const receipt = JSON.parse(readFileSync(f.receipt, 'utf8'));
  assert.equal(receipt.attempts[0].status, 'scheduled'); assert.equal(receipt.attempts[0].broadcastId, broadcastId);
  assert.doesNotMatch(readFileSync(f.receipt, 'utf8'), /@|fixture-full-key/);
  const calls = sends(f.calls()); assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.resend.com/broadcasts'); assert.equal(calls[0].body?.segment_id, segmentId); assert.equal(calls[0].body?.topic_id, topicId);
  assert.match(String(calls[0].body?.html), /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
  assert.equal(calls[1].url, `https://api.resend.com/broadcasts/${broadcastId}/send`); assert.ok(calls[1].body?.scheduled_at);
  const blocked = await f.start().result; assert.equal(blocked.code, 1); assert.match(blocked.output, /already has a scheduled Resend broadcast/);
  assert.equal(sends(f.calls()).length, 2);
});

test('production URL validation and missing config fail before broadcast operations', async (t) => {
  const f = fixture(t);
  for (const [mode, env] of [['unpublished', {}], ['success', { RESEND_CONTACTS_API_KEY: '' }], ['success', { RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID: '' }], ['success', { RESEND_TOPIC_ESSAYS_ID: '' }]] as const) {
    const result = await f.start(['--send'], mode, env).result; assert.equal(result.code, 1, result.output);
  }
  assert.equal(sends(f.calls()).length, 0); assert.equal(existsSync(f.receipt), false);
});

test('ambiguous broadcast failures leave a pending receipt and block retry', async (t) => {
  for (const mode of ['create-fail', 'send-fail']) {
    const f = fixture(t); const first = await f.start(['--send'], mode).result;
    assert.equal(first.code, 1, first.output); assert.equal(JSON.parse(readFileSync(f.receipt, 'utf8')).attempts[0].status, 'pending');
    const retry = await f.start(['--send', '--resend', '--reason', 'Reviewed recovery']).result;
    assert.equal(retry.code, 1, retry.output); assert.match(retry.output, /ambiguous result/);
  }
});

test('a prior broadcast receipt also blocks accidental duplicate send', async (t) => {
  const f = fixture(t); f.seed({ attempts: [{ completedAt: '2026-01-01T00:00:00Z' }] }, '.json');
  const result = await f.start().result; assert.equal(result.code, 1, result.output); assert.match(result.output, /already has a scheduled/); assert.equal(sends(f.calls()).length, 0);
});
