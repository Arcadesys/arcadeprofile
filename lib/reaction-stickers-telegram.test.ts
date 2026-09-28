import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  createStickerSession, publishStickerSet, readStickerSession, stickerRedirect, validateStickerFiles,
} from './reaction-stickers-telegram';
import { startTelegramLogin } from './reaction-stickers-telegram-auth';

const envName = 'REACTION_STICKERS_TELEGRAM_BOT_TOKEN';
const previous = process.env[envName];
test.after(() => { if (previous === undefined) delete process.env[envName]; else process.env[envName] = previous; });

test('Telegram redirects carry the session cookie without caching', () => {
  const response = stickerRedirect('https://oauth.telegram.org/auth', 'reaction_stickers_telegram_tx=abc; HttpOnly; Secure');
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://oauth.telegram.org/auth');
  assert.equal(response.headers.get('set-cookie'), 'reaction_stickers_telegram_tx=abc; HttpOnly; Secure');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Telegram session is signed, scoped, and expires', () => {
  const botToken = '123456:abcdefghijklmnopqrstuvwxyz123456';
  process.env[envName] = botToken;
  const now = 1_800_000_000_000;
  const session = createStickerSession({ id: '123456789', label: 'Visitor' }, now);
  assert.deepEqual(readStickerSession(`reaction_stickers_telegram=${session}`, now), { id: '123456789', label: 'Visitor' });
  assert.equal(readStickerSession(`reaction_stickers_telegram=${session}`, now + 31 * 60_000), null);
  assert.equal(readStickerSession(`reaction_stickers_telegram=${session}x`, now), null);
});

test('pack validation enforces ordered transparent 512px PNGs', async () => {
  const png = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#00000000' } }).png().toBuffer();
  const form = new FormData();
  form.set('title', 'Visitor reactions');
  form.set('slug', 'visitor_reactions');
  for (let index = 0; index < 10; index++) form.set(`sticker_${index}`, new File([png], `${index}.png`, { type: 'image/png' }));
  const pack = await validateStickerFiles(form);
  assert.equal(pack.files.length, 10);
  assert.deepEqual(pack.emojis, ['👋', '❤️', '😂', '🙏', '👍', '🙅', '😢', '😠', '🤔', '😴']);
  form.set('emoji_0', '💜');
  assert.equal((await validateStickerFiles(form)).emojis[0], '💜');
  form.set('emoji_0', 'hello');
  await assert.rejects(validateStickerFiles(form), /HELLO needs a Telegram emoji/);
  form.delete('emoji_0');
  form.delete('sticker_5');
  await assert.rejects(validateStickerFiles(form), /NO needs a transparent PNG/);
  form.set('sticker_5', new File([png], '5.png', { type: 'image/png' }));
  form.set('sticker_0', new File(['not a PNG'], '0.png', { type: 'image/png' }));
  await assert.rejects(validateStickerFiles(form), /HELLO needs a transparent PNG|HELLO is not a PNG/);
});

test('publisher uses the signed-in visitor as Telegram owner and verifies the set', async () => {
  const priorFetch = globalThis.fetch;
  const prior = Object.fromEntries(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'].map((key) => [key, process.env[key]]));
  process.env[envName] = '123456:abcdefghijklmnopqrstuvwxyz123456';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const calls: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url === 'https://redis.example') return Response.json({ result: 1 });
      const method = url.split('/').pop() || '';
      calls.push(method);
      if (method === 'getMe') return Response.json({ ok: true, result: { is_bot: true, username: 'stickerslopbot' } });
      if (method === 'getStickerSet') {
        return calls.filter((item) => item === 'getStickerSet').length === 1
          ? Response.json({ ok: false, error_code: 400 })
          : Response.json({ ok: true, result: { name: 'visitor_reactions_by_stickerslopbot', title: 'Visitor reactions', stickers: Array(10).fill({}) } });
      }
      if (method === 'createNewStickerSet') {
        const form = init?.body as FormData;
        assert.equal(form.get('user_id'), '987654321');
        assert.equal(form.get('name'), 'visitor_reactions_by_stickerslopbot');
        assert.equal(JSON.parse(String(form.get('stickers'))).length, 10);
        return Response.json({ ok: true, result: true });
      }
      throw new Error(`Unexpected request: ${url}`);
    };
    const result = await publishStickerSet('987654321', { title: 'Visitor reactions', slug: 'visitor_reactions', files: Array(10).fill(Buffer.from('png')), emojis: Array(10).fill('👋') });
    assert.deepEqual(result, { status: 'created_verified', url: 'https://t.me/addstickers/visitor_reactions_by_stickerslopbot' });
    assert.deepEqual(calls, ['getMe', 'getStickerSet', 'createNewStickerSet', 'getStickerSet']);
  } finally {
    globalThis.fetch = priorFetch;
    for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('Telegram sign-in uses a one-time state and PKCE', async () => {
  const keys = ['REACTION_STICKERS_TELEGRAM_CLIENT_ID', 'REACTION_STICKERS_TELEGRAM_CLIENT_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const priorFetch = globalThis.fetch;
  process.env[envName] = '123456:abcdefghijklmnopqrstuvwxyz123456';
  process.env.REACTION_STICKERS_TELEGRAM_CLIENT_ID = '123456';
  process.env.REACTION_STICKERS_TELEGRAM_CLIENT_SECRET = 'test-secret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const commands: unknown[][] = [];
  try {
    globalThis.fetch = async (_input, init) => {
      commands.push(JSON.parse(String(init?.body)));
      return Response.json({ result: commands.length === 1 ? 1 : 'OK' });
    };
    const result = await startTelegramLogin();
    const url = new URL(result.url);
    assert.equal(url.origin, 'https://oauth.telegram.org');
    assert.equal(url.searchParams.get('scope'), 'openid profile telegram:bot_access');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(url.searchParams.get('state'));
    assert.match(result.cookie, /HttpOnly; Secure; SameSite=Lax/);
    assert.equal(commands[0][0], 'EVAL');
    assert.equal(commands[1][0], 'SET');
  } finally {
    globalThis.fetch = priorFetch;
    for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
