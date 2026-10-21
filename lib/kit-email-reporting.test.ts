import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { runKitEmail } from './kit-email';

const pagination = (hasNext = false, cursor: string | null = null) => ({ has_next_page: hasNext, end_cursor: cursor });
const broadcast = (id: number, status = 'completed', subject = 'Launch', createdAt = '2026-10-20T12:00:00Z') => ({
  id, status, subject, created_at: createdAt, send_at: status === 'draft' ? null : '2026-10-20T13:00:00Z',
  email_address: 'subscriber@example.invalid', content: 'fixture-secret private body',
});
function fixture(t: TestContext, handler: (url: URL) => unknown | Response) {
  const root = mkdtempSync(path.join(tmpdir(), 'kit-report-'));
  const calls: URL[] = [];
  const output: string[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    assert.equal(init?.method, 'GET', 'Reporting must make only GET requests');
    assert.equal(init.body, undefined);
    assert.equal(new Headers(init.headers).get('X-Kit-Api-Key'), 'fixture-secret');
    const address = new URL(String(url));
    assert.equal(address.origin, 'https://api.kit.com');
    calls.push(address);
    const response = handler(address);
    return response instanceof Response ? response : Response.json(response);
  };
  const run = (args: string[]) => runKitEmail(args, { root, env: { KIT_API_KEY: 'fixture-secret' }, fetchImpl, log: (line) => output.push(line) });
  t.after(() => {
    assert.deepEqual(readdirSync(root), [], 'Read-only reporting must not create a file, receipt, directory or lock');
    assert.doesNotMatch(output.join('\n'), /fixture-secret|subscriber@|private body/);
    rmSync(root, { force: true, recursive: true });
  });
  return { root, calls, output, run, report: () => JSON.parse(output.at(-1)!) };
}

test('history follows cursor pages, sorts recent broadcasts and projects only safe fields', async (t) => {
  const f = fixture(t, (url) => {
    assert.equal(url.pathname, '/v4/broadcasts');
    assert.equal(url.searchParams.get('slim'), 'true');
    assert.equal(url.searchParams.get('per_page'), '100');
    return url.searchParams.has('after')
      ? { broadcasts: [broadcast(3, 'draft', 'New launch', '2026-10-21T12:00:00Z')], pagination: pagination() }
      : { broadcasts: [broadcast(1, 'completed', 'Old launch', '2026-09-01T12:00:00Z'), broadcast(2, 'scheduled', 'Upcoming launch')], pagination: pagination(true, 'opaque+/=') };
  });
  await f.run(['--list']);
  assert.equal(f.calls[1].searchParams.get('after'), 'opaque+/=');
  assert.equal(f.report().historyComplete, true);
  assert.equal(f.report().scannedPages, 2);
  assert.deepEqual(f.report().broadcasts.map((item: { id: number }) => item.id), [3, 2, 1]);
  assert.equal(f.report().broadcasts[0].sendAt, null);
  assert.equal(f.report().broadcasts[2].status, 'completed');
  assert.deepEqual(Object.keys(f.report().broadcasts[0]).sort(), ['createdAt', 'id', 'sendAt', 'status', 'subject']);
});

test('subject search includes later pages and does not turn partial absence into never sent', async (t) => {
  const f = fixture(t, (url) => url.searchParams.has('after')
    ? { broadcasts: [broadcast(1, 'completed', 'This is what I do for fun')], pagination: pagination() }
    : { broadcasts: [broadcast(2, 'draft', 'Other')], pagination: pagination(true, 'next') });
  await f.run(['--list', '--subject', 'WHAT I DO', '--max-pages', '1']);
  assert.equal(f.report().historyComplete, false);
  assert.deepEqual(f.report().broadcasts, []);
  await f.run(['--list', '--subject', 'WHAT I DO']);
  assert.equal(f.report().historyComplete, true);
  assert.equal(f.report().broadcasts[0].id, 1);
});

test('listing exposes result truncation and redacts addresses/secrets in subjects', async (t) => {
  const f = fixture(t, () => ({ broadcasts: [broadcast(2, 'completed', 'Hello subscriber@example.invalid fixture-secret'), broadcast(1)], pagination: pagination() }));
  await f.run(['--list', '--limit', '1']);
  assert.equal(f.report().matchingBroadcasts, 2);
  assert.equal(f.report().resultsLimited, true);
  assert.match(f.report().broadcasts[0].subject, /redacted address.*redacted/);
});

test('stats projects recipients, raw rates, unsubscribes and tracking limitations only', async (t) => {
  const f = fixture(t, (url) => {
    assert.equal(url.pathname, '/v4/broadcasts/44/stats');
    return { broadcast: { id: 44, email_address: 'subscriber@example.invalid', stats: {
      status: 'completed', recipients: 123, open_rate: 43.2, click_rate: 5.1, unsubscribes: 2,
      open_tracking_disabled: true, click_tracking_disabled: false, subscribers: ['subscriber@example.invalid'],
    } } };
  });
  await f.run(['--stats', '44']);
  assert.equal(f.calls.length, 1);
  assert.equal(f.report().recipients, 123);
  assert.equal(f.report().openRate, 43.2);
  assert.equal(f.report().clickRate, 5.1);
  assert.equal(f.report().unsubscribes, 2);
  assert.equal(f.report().openTrackingDisabled, true);
  assert.equal(f.report().clickTrackingDisabled, false);
});

test('stats preserve unavailable metrics as null and reject mismatched IDs', async (t) => {
  const f = fixture(t, () => ({ broadcast: { id: 44, stats: { status: 'draft', recipients: 0, open_rate: null } } }));
  await f.run(['--stats', '44']);
  assert.equal(f.report().recipients, 0);
  assert.equal(f.report().openRate, null);
  assert.equal(f.report().clickRate, null);
  assert.equal(f.report().unsubscribes, null);
  await assert.rejects(f.run(['--stats', '45']), /different broadcast/);
});

test('counts request aggregate metadata and embedded tag counts without enumerating subscribers', async (t) => {
  const f = fixture(t, (url) => {
    if (url.pathname === '/v4/subscribers') {
      assert.equal(url.searchParams.get('per_page'), '1');
      assert.equal(url.searchParams.get('slim'), 'true');
      assert.equal(url.searchParams.get('include_total_count'), 'true');
      assert.equal(url.searchParams.has('after'), false);
      return { subscribers: [{ email_address: 'subscriber@example.invalid', first_name: 'Private' }], pagination: { total_count: url.searchParams.get('status') === 'active' ? 80 : 100, has_next_page: true } };
    }
    assert.equal(url.pathname, '/v4/tags');
    assert.equal(url.searchParams.get('include'), 'subscriber_count');
    return url.searchParams.has('after')
      ? { tags: [{ id: 2, name: 'Essays', subscriber_count: 70 }], pagination: pagination() }
      : { tags: [{ id: 1, name: 'Writing', subscriber_count: 80 }, { id: 3, name: 'subscriber@example.invalid fixture-secret' }], pagination: pagination(true, 'next') };
  });
  await f.run(['--counts']);
  assert.equal(f.calls.length, 4);
  assert.equal(f.calls.filter((url) => url.pathname === '/v4/subscribers').length, 2);
  assert.equal(f.report().allSubscribers, 100);
  assert.equal(f.report().activeSubscribers, 80);
  assert.equal(f.report().tagsComplete, true);
  assert.equal(f.report().tags.length, 3);
  assert.equal(f.report().tags[2].subscriberCount, null);
  assert.match(f.report().note, /overlap.*not an active OR/);
});

test('counts label missing totals and incomplete tag pagination without inventing zero', async (t) => {
  const f = fixture(t, (url) => url.pathname === '/v4/subscribers'
    ? { subscribers: [], pagination: {} }
    : { tags: [{ id: 1, name: 'Writing', subscriber_count: 0 }], pagination: pagination(true, 'next') });
  await f.run(['--counts', '--max-pages', '1']);
  assert.equal(f.report().allSubscribers, null);
  assert.equal(f.report().activeSubscribers, null);
  assert.equal(f.report().tags[0].subscriberCount, 0);
  assert.equal(f.report().tagsComplete, false);
});

test('pagination loops and malformed provider fields fail without partial output', async (t) => {
  for (const response of [
    { broadcasts: [], pagination: pagination(true) },
    { broadcasts: [], pagination: pagination(true, 'repeated') },
    { broadcasts: [broadcast(1, 'unknown subscriber@example.invalid')], pagination: pagination() },
    { broadcasts: [{ ...broadcast(1), send_at: 'subscriber@example.invalid' }], pagination: pagination() },
  ]) {
    const f = fixture(t, () => response);
    await assert.rejects(f.run(['--list']), /Invalid/);
    assert.deepEqual(f.output, []);
    assert.ok(f.calls.length <= 2);
  }
});

test('HTTP errors and transport errors cannot expose raw provider data', async (t) => {
  for (const handler of [
    () => new Response('fixture-secret subscriber@example.invalid', { status: 401 }),
    () => { throw new Error('fixture-secret subscriber@example.invalid'); },
  ]) {
    const f = fixture(t, handler);
    await assert.rejects(f.run(['--list']), (error: Error) => /read-only report failed/.test(error.message) && !/fixture-secret|subscriber@/.test(error.message));
    assert.deepEqual(f.output, []);
  }
});

test('invalid read-mode combinations, limits and IDs are rejected before any request', async (t) => {
  const f = fixture(t, () => assert.fail('Invalid options must not request anything'));
  for (const args of [
    ['--list', '--send'], ['--list', '--file', 'private.md'], ['--counts', '--preview-to', 'subscriber@example.invalid'],
    ['--list', '--counts'], ['--stats', '44', '--list'], ['--stats', '0'], ['--stats', 'bad'],
    ['--stats', '1', '--max-pages', '2'], ['--counts', '--subject', 'Launch'], ['--list', '--limit', '0'],
    ['--list', '--max-pages', '101'], ['--list', '--resend'], ['--counts', '--audience', 'all'],
  ]) await assert.rejects(f.run(args));
  await assert.rejects(runKitEmail(['--list'], { root: f.root, env: {}, fetchImpl: async () => assert.fail('No key') }), /KIT_API_KEY/);
  assert.deepEqual(f.calls, []);
});

test('actual CLI reporting needs no markdown file and stays GET-only under interception', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'kit-report-cli-'));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const preload = path.join(root, 'mock.mjs');
  writeFileSync(preload, `globalThis.fetch = async (url, init) => {
    if (init.method !== 'GET' || String(url) !== 'https://api.kit.com/v4/broadcasts/44/stats') throw new Error('Forbidden request');
    return Response.json({broadcast:{id:44,stats:{status:'completed',recipients:12,open_rate:0.5,click_rate:0.2,unsubscribes:1},email_address:'subscriber@example.invalid'}});
  };`);
  const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), '--import', preload,
    fileURLToPath(new URL('../scripts/kit-email.ts', import.meta.url)), '--stats', '44'],
  { cwd: root, env: { PATH: process.env.PATH, NODE_ENV: 'test', KIT_API_KEY: 'fixture-secret' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).recipients, 12);
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-secret|subscriber@/);
  assert.deepEqual(readdirSync(root), ['mock.mjs']);
});
