import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { emailLinks, parseKitEmail, runKitEmail } from './kit-email';

const subject = 'This is what I do for fun is out';
const source = readFileSync(new URL('../scripts/fixtures-kit-email-launch.md', import.meta.url), 'utf8');
const yaml = '---\nsubject: A standalone broadcast\npreview: Preview copy\naudience: [all, essays]\n---\nHello [reader](https://example.invalid/read?a=1&b=2).';

function fixture(t: TestContext) {
  const root = mkdtempSync(path.join(tmpdir(), 'kit-email-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'launch.md'), source);
  const env = { KIT_API_KEY: 'fixture-secret', KIT_TAG_ALL_WRITING_ID: '11', KIT_TAG_ESSAYS_ID: '12', KIT_TAG_FICTION_ID: '13', POSTMARK_SERVER_TOKEN: 'fixture-postmark-secret', POSTMARK_FROM_EMAIL: 'sender@example.invalid' };
  const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];
  const broadcasts = new Map<number, Record<string, unknown>>();
  const output: string[] = [];
  let nextId = 40;
  let broken = false;
  let failWrite = false;
  let inspect: (() => void) | undefined;
  const fetchImpl: typeof fetch = async (url, init) => {
    const address = String(url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url: address, method, body });
    if (address.startsWith('https://example.invalid/')) return new Response(null, { status: broken ? 404 : 200 });
    if (address === 'https://api.postmarkapp.com/email') {
      assert.equal(body.To, 'preview@example.invalid');
      assert.match(body.Subject, /^\[Preview\]/);
      return Response.json({ ErrorCode: 0 });
    }
    assert.match(address, /^https:\/\/api\.kit\.com\/v4\/broadcasts(?:\/\d+)?$/);
    if (method === 'POST' || method === 'PUT') {
      assert.equal(existsSync(receiptFile() + '.lock'), true);
      const receipt = JSON.parse(readFileSync(receiptFile(), 'utf8'));
      assert.match(receipt.attempts.at(-1).state, /pending$/);
      inspect?.();
      if (failWrite) throw new Error('fixture-secret subscriber@example.invalid');
      const id = method === 'POST' ? ++nextId : Number(address.split('/').at(-1));
      const broadcast = { ...(broadcasts.get(id) ?? {}), ...body, id, status: body.send_at ? 'scheduled' : 'draft', email_template: { id: 5 }, email_address: 'subscriber@example.invalid' };
      broadcasts.set(id, broadcast);
      return Response.json({ broadcast });
    }
    assert.equal(method, 'GET');
    return Response.json({ broadcast: broadcasts.get(Number(address.split('/').at(-1))) });
  };
  function receiptFile() {
    const directory = path.join(root, 'data/newsletter-sends');
    return path.join(directory, readdirSync(directory).find((name) => name.endsWith('.kit.json'))!);
  }
  const run = (args: string[] = [], overrides = {}) => runKitEmail(['--file', 'launch.md', '--audience', 'all,essays,fiction', ...args], { root, env, fetchImpl, log: (line) => output.push(line), ...overrides });
  const send = (id = 41, args: string[] = []) => run(['--send', '--broadcast-id', String(id), '--confirm', subject, ...args]);
  const receipt = () => JSON.parse(readFileSync(receiptFile(), 'utf8'));
  return { root, env, fetchImpl, calls, broadcasts, output, run, send, receipt, receiptFile,
    breakLinks: () => { broken = true; }, failWrites: () => { failWrite = true; }, inspect: (callback: () => void) => { inspect = callback; } };
}

test('launch labeled sections and YAML inputs parse without leaking approval notes', () => {
  const launch = parseKitEmail(source, 'all,essays,fiction');
  assert.equal(launch.subject, subject);
  assert.equal(launch.preview, 'Eight stories, a new paperback, and your free copy.');
  assert.match(launch.body, /— Austen$/);
  assert.doesNotMatch(launch.body, /Targeting for approval|deliberately/);
  assert.deepEqual(parseKitEmail(yaml).audience, ['all', 'essays']);
  assert.throws(() => parseKitEmail(source), /explicit audience/);
  assert.throws(() => parseKitEmail(source, 'everyone'), /explicit audience/);
  assert.throws(() => parseKitEmail(yaml, 'fiction'), /disagree/);
  assert.throws(() => parseKitEmail(source + '\n## Body\nAnother body', 'all'), /exactly one/);
});

test('dry run renders launch HTML/text/OR targeting with no network or disk writes', async (t) => {
  const f = fixture(t);
  await f.run([], { fetchImpl: async () => { assert.fail('Dry run must be offline'); }, env: {} });
  const output = JSON.parse(f.output[0]);
  assert.equal(output.mode, 'dry-run');
  assert.equal(output.subject, subject);
  assert.match(output.html, /<em>This is what I do for fun<\/em>/);
  assert.match(output.html, /font-size:20px/);
  assert.match(output.html, /<ul><li><a /);
  assert.match(output.text, /Here's the complete book in EPUB and PDF/);
  assert.equal(output.links.length, 4);
  assert.equal(output.approximateRecipients, null);
  assert.deepEqual(output.targeting.tags.map((tag: { key: string }) => tag.key), ['all', 'essays', 'fiction']);
  assert.deepEqual(f.calls, []);
  assert.equal(existsSync(path.join(f.root, 'data')), false);
});

test('draft POST is unscheduled/private; GET verifies fields and saves non-PII receipt', async (t) => {
  const f = fixture(t);
  await f.run(['--draft']);
  assert.deepEqual(f.calls.map((call) => call.method), ['POST', 'GET']);
  assert.equal(f.calls[0].body.send_at, null);
  assert.equal(f.calls[0].body.public, false);
  assert.equal(f.calls[0].body.published_at, null);
  assert.deepEqual(f.calls[0].body.subscriber_filter, [{ all: null, any: [{ type: 'tag', ids: [11, 12, 13] }], none: null }]);
  assert.equal(f.receipt().attempts[0].state, 'draft');
  assert.match(f.output.join('\n'), /https:\/\/app\.kit\.com\/broadcasts\/41\/edit/);
  assert.doesNotMatch(f.output.join('\n') + readFileSync(f.receiptFile(), 'utf8'), /fixture-secret|fixture-postmark-secret|subscriber@|sender@/);
  await f.run(['--draft']);
  assert.deepEqual(f.calls.map((call) => call.method), ['POST', 'GET', 'GET']);
});

test('missing or mismatched confirmation/ID fails before any requests', async (t) => {
  const f = fixture(t);
  await assert.rejects(f.run(['--send', '--broadcast-id', '41']), /exact subject/);
  await assert.rejects(f.run(['--send', '--broadcast-id', '41', '--confirm', 'wrong']), /exact subject/);
  await assert.rejects(f.run(['--send', '--confirm', subject]), /broadcast ID/);
  await assert.rejects(f.send(), /matching locally verified draft/);
  assert.deepEqual(f.calls, []);
});

test('send checks all links and schedules only the reviewed draft ID', async (t) => {
  const f = fixture(t);
  await f.run(['--draft']);
  await f.send(41, ['--send-at', '2099-10-20T12:00:00Z']);
  const writes = f.calls.filter((call) => call.method === 'PUT');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].url, 'https://api.kit.com/v4/broadcasts/41');
  assert.equal(writes[0].body.public, false);
  assert.equal(writes[0].body.send_at, '2099-10-20T12:00:00.000Z');
  assert.equal(f.calls.filter((call) => call.url.startsWith('https://example.invalid/')).length, 4);
  assert.equal(f.receipt().attempts[0].state, 'scheduled');
});

test('broken link, stale time and changed body fail before scheduling', async (t) => {
  const f = fixture(t);
  await f.run(['--draft']);
  await assert.rejects(f.send(41, ['--send-at', '2000-01-01T00:00:00Z']), /future ISO/);
  f.breakLinks();
  await assert.rejects(f.send(), /HTTP 200/);
  writeFileSync(path.join(f.root, 'launch.md'), source.replace('Hey friends,', 'Changed copy.'));
  await assert.rejects(f.send(), /matching locally verified draft/);
  assert.equal(f.calls.some((call) => call.method === 'PUT'), false);
  assert.equal(f.receipt().attempts[0].state, 'draft');
});

test('remote draft drift in safety, copy, template or targeting blocks sends', async (t) => {
  const changes = [{ public: true }, { send_at: '2099-01-01T00:00:00Z' }, { status: 'sent' }, { subject: 'changed' }, { preview_text: 'changed' }, { content: '<p>changed</p>' }, { email_template: { id: 9 } }, { subscriber_filter: [{ any: [{ type: 'tag', ids: [999] }] }] }];
  for (const change of changes) {
    const f = fixture(t);
    await f.run(['--draft']);
    Object.assign(f.broadcasts.get(41)!, change);
    await assert.rejects(f.send(), /Kit (readback|draft)/);
    assert.equal(f.calls.some((call) => call.method === 'PUT'), false);
  }
});

test('duplicate sends need a new reviewed draft, --resend and a nonempty reason', async (t) => {
  const f = fixture(t);
  await f.run(['--draft']);
  await f.send();
  await assert.rejects(f.send(), /Already scheduled/);
  await assert.rejects(f.send(41, ['--resend']), /nonempty --reason/);
  await assert.rejects(f.send(41, ['--resend', '--reason', 'Intentional repeat']), /matching locally verified draft/);
  await f.run(['--draft', '--resend', '--reason', 'Intentional repeat']);
  await f.send(42, ['--resend', '--reason', 'subscriber@example.invalid']);
  assert.equal(f.calls.filter((call) => call.method === 'PUT').length, 2);
  assert.doesNotMatch(readFileSync(f.receiptFile(), 'utf8'), /subscriber@/);
});

test('uncertain draft and send responses stay pending and cannot be retried or bypassed', async (t) => {
  for (const mode of ['draft', 'send']) {
    const f = fixture(t);
    if (mode === 'send') await f.run(['--draft']);
    f.failWrites();
    await assert.rejects(mode === 'draft' ? f.run(['--draft']) : f.send(), /reconcile any pending/);
    const count = f.calls.length;
    await assert.rejects(f.run(['--draft', '--resend', '--reason', 'Retry']), /Ambiguous pending/);
    assert.equal(f.calls.length, count);
    assert.match(f.receipt().attempts[0].state, /pending$/);
    assert.doesNotMatch(f.output.join('\n') + readFileSync(f.receiptFile(), 'utf8'), /fixture-secret|subscriber@/);
  }
});

test('failed draft readback leaves pending receipt and ID for reconciliation', async (t) => {
  const f = fixture(t);
  const fetchImpl: typeof fetch = async (_url, init) => Response.json({ broadcast: init?.method === 'POST' ? { id: 71 } : { id: 71, public: true, send_at: null } });
  await assert.rejects(f.run(['--draft'], { fetchImpl }), /Kit readback/);
  assert.equal(f.receipt().attempts[0].state, 'draft-pending');
  assert.equal(f.receipt().attempts[0].broadcastId, 71);
});

test('invalid configuration, conflicting modes, corrupt receipts and locks fail closed', async (t) => {
  const f = fixture(t);
  await assert.rejects(f.run(['--draft'], { env: {} }), /tag IDs/);
  await assert.rejects(f.run(['--draft'], { env: { ...f.env, KIT_API_KEY: '' } }), /KIT_API_KEY/);
  await assert.rejects(f.run(['--draft', '--send']), /only one/);
  await f.run(['--draft']);
  writeFileSync(f.receiptFile() + '.lock', 'interrupted');
  await assert.rejects(f.send(), /interrupted email lock/);
  rmSync(f.receiptFile() + '.lock');
  writeFileSync(f.receiptFile(), '{broken json subscriber@example.invalid fixture-secret');
  await assert.rejects(f.send(), (error: Error) => !/subscriber@|fixture-secret/.test(error.message));
  assert.equal(f.calls.some((call) => call.method === 'PUT'), false);
});

test('preview uses only the single explicitly addressed Postmark path', async (t) => {
  const f = fixture(t);
  await f.run(['--preview-to', 'preview@example.invalid']);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://api.postmarkapp.com/email');
  assert.doesNotMatch(f.output.join('\n'), /preview@|sender@|fixture-postmark-secret/);
  assert.equal(existsSync(path.join(f.root, 'data')), false);
  await assert.rejects(f.run(['--preview-to', 'preview@example.invalid,second@example.invalid']), /reconcile/);
  assert.equal(f.calls.length, 1);
});

test('rendered links preserve query separators', async (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.root, 'query.md'), yaml);
  const output: string[] = [];
  await runKitEmail(['--file', 'query.md'], { root: f.root, env: {}, log: (line) => output.push(line) });
  assert.deepEqual(emailLinks(JSON.parse(output[0]).html), ['https://example.invalid/read?a=1&b=2']);
});

test('actual CLI dry run is offline with sanitized env and fetch interception', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.root, 'offline.mjs'), 'globalThis.fetch = () => { throw new Error("Unexpected network call"); };');
  const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), '--import', path.join(f.root, 'offline.mjs'), fileURLToPath(new URL('../scripts/kit-email.ts', import.meta.url)), '--file', 'launch.md', '--audience', 'all,essays,fiction'], { cwd: f.root, env: { PATH: process.env.PATH, NODE_ENV: 'test' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).subject, subject);
  assert.equal(existsSync(path.join(f.root, 'data')), false);
});


test('the exclusive lock blocks a concurrent writer before its provider request', async (t) => {
  const f = fixture(t);
  let entered!: () => void;
  let release!: () => void;
  const providerEntered = new Promise<void>((resolve) => { entered = resolve; });
  const providerReleased = new Promise<void>((resolve) => { release = resolve; });
  const first = f.run(['--draft'], { fetchImpl: async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') { entered(); await providerReleased; }
    return f.fetchImpl(url, init);
  } });
  await providerEntered;
  try { await assert.rejects(f.run(['--draft']), /interrupted email lock/); }
  finally { release(); }
  await first;
  assert.equal(f.calls.filter((call) => call.method === 'POST').length, 1);
});

test('dry output redacts configured secrets even if copy contains them', async (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.root, 'launch.md'), source.replace('Hey friends,', 'fixture-secret fixture-postmark-secret'));
  await f.run();
  assert.doesNotMatch(f.output.join('\n'), /fixture-secret|fixture-postmark-secret/);
  assert.match(f.output.join('\n'), /redacted/);
});

test('every audience resolves through the existing mapping without a fallback', async (t) => {
  const f = fixture(t);
  await runKitEmail(['--file', 'launch.md', '--audience', 'lab,queer-columns,work-ai,th4f', '--draft'], {
    root: f.root, env: { ...f.env, KIT_TAG_LAB_ID: '14' }, fetchImpl: f.fetchImpl, log: () => {},
  });
  assert.deepEqual(f.calls[0].body.subscriber_filter, [{ all: null, any: [{ type: 'tag', ids: [14, 23866437, 23808390, 23806915] }], none: null }]);
});
