import { createHmac, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { redisCommand } from './writing-signup';

const BOT_USERNAME = 'stickerslopbot';
const SESSION_NAME = 'reaction_stickers_telegram';
const SESSION_SECONDS = 30 * 60;
const MAX_REQUEST_BYTES = 3_800_000;
const MAX_PNG_BYTES = 512 * 1024;
const REACTIONS = [
  ['HELLO', '👋'], ['LOVE', '❤️'], ['LAUGH', '😂'], ['THANKS', '🙏'],
  ['YES', '👍'], ['NO', '🙅'], ['SAD', '😢'], ['ANGRY', '😠'],
  ['THINKING', '🤔'], ['SLEEPY', '😴'],
] as const;

export class StickerUploadError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function token() {
  const value = process.env.REACTION_STICKERS_TELEGRAM_BOT_TOKEN;
  if (!value || !/^\d+:[A-Za-z0-9_-]{20,}$/.test(value)) return null;
  return value;
}

export function stickerUploadEnabled() {
  const id = process.env.REACTION_STICKERS_TELEGRAM_CLIENT_ID;
  const secret = process.env.REACTION_STICKERS_TELEGRAM_CLIENT_SECRET;
  const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  return Boolean(token() && id && secret && token()?.startsWith(`${id}:`) && redis);
}

function sign(value: string) {
  const secret = token();
  if (!secret) throw new StickerUploadError(503, 'Telegram publishing is not configured yet.');
  return createHmac('sha256', secret).update(`reaction-stickers\n${value}`).digest('base64url');
}

function equal(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createStickerSession(identity: { id: string; label: string }, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ ...identity, exp: Math.floor(now / 1000) + SESSION_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readStickerSession(cookie: string | null, now = Date.now()) {
  if (!token()) return null;
  const value = cookie?.split(/;\s*/).find((part) => part.startsWith(`${SESSION_NAME}=`))?.slice(SESSION_NAME.length + 1);
  if (!value || value.length > 512) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra || !equal(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { id?: unknown; label?: unknown; exp?: unknown };
    if (typeof data.id !== 'string' || !/^[1-9]\d{0,15}$/.test(data.id) ||
      typeof data.label !== 'string' || typeof data.exp !== 'number' || data.exp <= now / 1000) return null;
    return { id: data.id, label: data.label };
  } catch { return null; }
}

export function stickerSessionCookie(value: string) {
  return `${SESSION_NAME}=${value}; Path=/api/reaction-stickers/telegram; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function sameSiteRequest(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.REACTION_STICKERS_PUBLIC_ORIGIN || 'https://www.thearcades.me';
  return origin === expected;
}

export async function validateStickerFiles(form: FormData) {
  const title = form.get('title');
  const slug = form.get('slug');
  if (typeof title !== 'string' || [...title.trim()].length < 1 || [...title.trim()].length > 64 ||
    typeof slug !== 'string' || !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(slug) || slug.length > 32) {
    throw new StickerUploadError(400, 'Enter a pack title and a short name using lowercase letters, numbers, and underscores.');
  }
  const files: Buffer[] = [];
  const emojis: string[] = [];
  let total = 0;
  for (let index = 0; index < REACTIONS.length; index++) {
    const file = form.get(`sticker_${index}`);
    if (!(file instanceof File) || file.type !== 'image/png' || file.size < 100 || file.size > MAX_PNG_BYTES) {
      throw new StickerUploadError(400, `${REACTIONS[index][0]} needs a transparent PNG no larger than 512 KB.`);
    }
    total += file.size;
    if (total > MAX_REQUEST_BYTES - 10_000) throw new StickerUploadError(413, 'This pack is too large to upload together. Make the PNGs smaller and try again.');
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new StickerUploadError(400, `${REACTIONS[index][0]} is not a PNG file.`);
    }
    try {
      const metadata = await sharp(buffer, { limitInputPixels: 512 * 512 }).metadata();
      if (metadata.format !== 'png' || !metadata.hasAlpha || !metadata.width || !metadata.height ||
        Math.max(metadata.width, metadata.height) !== 512 || Math.min(metadata.width, metadata.height) < 1) {
        throw new Error('invalid dimensions or transparency');
      }
    } catch { throw new StickerUploadError(400, `${REACTIONS[index][0]} must be a transparent PNG with one side exactly 512 pixels.`); }
    files.push(buffer);
    const selected = form.get(`emoji_${index}`);
    const emoji = selected === null ? REACTIONS[index][1] : typeof selected === 'string' ? selected.trim() : '';
    if ([...emoji].length < 1 || [...emoji].length > 32 || !/\p{Extended_Pictographic}/u.test(emoji)) {
      throw new StickerUploadError(400, `${REACTIONS[index][0]} needs a Telegram emoji.`);
    }
    emojis.push(emoji);
  }
  return { title: title.trim(), slug, files, emojis };
}

async function telegram(method: string, body: FormData | Record<string, unknown>) {
  const botToken = token();
  if (!botToken) throw new StickerUploadError(503, 'Telegram publishing is not configured yet.');
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    ...(body instanceof FormData ? { body } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(25_000),
  });
  return response.json() as Promise<{ ok?: boolean; result?: unknown; error_code?: number }>;
}

async function rateLimit(userId: string) {
  const digest = createHmac('sha256', token() || '').update(`visitor:${userId}`).digest('hex');
  const day = new Date().toISOString().slice(0, 10);
  const script = 'local n=redis.call("INCR",KEYS[1]); if n==1 then redis.call("EXPIRE",KEYS[1],86400) end; return n';
  try {
    const [personal, global] = await Promise.all([
      redisCommand<number>(['EVAL', script, 1, `reaction-stickers:publish:${day}:${digest}`]),
      redisCommand<number>(['EVAL', script, 1, `reaction-stickers:publish:${day}:global`]),
    ]);
    if (personal > 3 || global > 100) throw new StickerUploadError(429, 'The Telegram publishing limit has been reached. Please try again tomorrow.');
  } catch (error) {
    if (error instanceof StickerUploadError) throw error;
    throw new StickerUploadError(503, 'Telegram publishing is temporarily unavailable. Please try again later.');
  }
}

export async function publishStickerSet(userId: string, pack: Awaited<ReturnType<typeof validateStickerFiles>>) {
  await rateLimit(userId);
  const me = await telegram('getMe', {});
  const bot = me.result as { username?: string; is_bot?: boolean } | undefined;
  if (!me.ok || !bot?.is_bot || bot.username?.toLowerCase() !== BOT_USERNAME) {
    throw new StickerUploadError(503, 'The sticker bot is not configured for this page.');
  }
  const name = `${pack.slug}_by_${BOT_USERNAME}`;
  const url = `https://t.me/addstickers/${name}`;
  const existing = await telegram('getStickerSet', { name });
  if (existing.ok) throw new StickerUploadError(409, 'That short name is already in use. Choose another before publishing.');
  if (existing.error_code !== 400) throw new StickerUploadError(503, 'Telegram could not check that pack name. Please try again later.');
  const form = new FormData();
  form.set('user_id', userId);
  form.set('name', name);
  form.set('title', pack.title);
  form.set('sticker_type', 'regular');
  form.set('stickers', JSON.stringify(pack.emojis.map((emoji, index) => ({ sticker: `attach://sticker_${index}`, format: 'static', emoji_list: [emoji] }))));
  pack.files.forEach((file, index) => form.set(`sticker_${index}`, new Blob([new Uint8Array(file)], { type: 'image/png' }), `${REACTIONS[index][0].toLowerCase()}.png`));
  let created: Awaited<ReturnType<typeof telegram>>;
  try { created = await telegram('createNewStickerSet', form); }
  catch {
    try { if ((await telegram('getStickerSet', { name })).ok) return { status: 'created_unverified' as const, url }; }
    catch { /* result remains uncertain */ }
    return { status: 'uncertain' as const, url };
  }
  if (!created.ok || created.result !== true) {
    try { if ((await telegram('getStickerSet', { name })).ok) return { status: 'created_unverified' as const, url }; }
    catch { return { status: 'uncertain' as const, url }; }
    throw new StickerUploadError(400, 'Telegram rejected this pack. Check the files and account before trying again.');
  }
  try {
    const readback = await telegram('getStickerSet', { name });
    const set = readback.result as { name?: string; title?: string; stickers?: unknown[] } | undefined;
    if (readback.ok && set?.name === name && set.title === pack.title && set.stickers?.length === REACTIONS.length) {
      return { status: 'created_verified' as const, url };
    }
    return { status: 'created_unverified' as const, url };
  } catch { return { status: 'created_unverified' as const, url }; }
}

export { MAX_REQUEST_BYTES, REACTIONS };
