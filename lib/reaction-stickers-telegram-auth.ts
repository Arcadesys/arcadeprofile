import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { redisCommand } from './writing-signup';
import { StickerUploadError, createStickerSession, stickerSessionCookie, stickerUploadEnabled } from './reaction-stickers-telegram';

const ISSUER = 'https://oauth.telegram.org';
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
const TX_COOKIE = 'reaction_stickers_telegram_tx';
const random = () => randomBytes(32).toString('base64url');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const callbackUrl = () => `${process.env.REACTION_STICKERS_PUBLIC_ORIGIN || 'https://www.thearcades.me'}/api/reaction-stickers/telegram/callback`;

function config() {
  if (!stickerUploadEnabled()) throw new StickerUploadError(503, 'Telegram publishing is not configured yet.');
  const clientId = process.env.REACTION_STICKERS_TELEGRAM_CLIENT_ID!;
  const clientSecret = process.env.REACTION_STICKERS_TELEGRAM_CLIENT_SECRET!;
  const botToken = process.env.REACTION_STICKERS_TELEGRAM_BOT_TOKEN!;
  return { clientId, clientSecret, botToken };
}

export async function startTelegramLogin() {
  const { clientId } = config();
  try {
    const minute = Math.floor(Date.now() / 60_000);
    const script = 'local n=redis.call("INCR",KEYS[1]); if n==1 then redis.call("EXPIRE",KEYS[1],120) end; return n';
    const count = await redisCommand<number>(['EVAL', script, 1, `reaction-stickers:login-rate:${minute}`]);
    if (count > 60) throw new StickerUploadError(429, 'Telegram sign-in is busy. Please try again shortly.');
  } catch (error) {
    if (error instanceof StickerUploadError) throw error;
    console.error('[reaction-stickers] Telegram login rate check failed', error instanceof Error ? error.message : 'unknown error');
    throw new StickerUploadError(503, 'Telegram sign-in is temporarily unavailable.');
  }
  const state = random(); const nonce = random(); const verifier = randomBytes(48).toString('base64url'); const browser = random();
  const transaction = JSON.stringify({ nonce, verifier, browserHash: hash(browser) });
  try {
    const saved = await redisCommand<string | null>(['SET', `reaction-stickers:login:${hash(state)}`, transaction, 'EX', 600, 'NX']);
    if (saved !== 'OK') throw new Error('state collision');
  } catch (error) {
    console.error('[reaction-stickers] Telegram login state save failed', error instanceof Error ? error.message : 'unknown error');
    throw new StickerUploadError(503, 'Telegram sign-in is temporarily unavailable.');
  }
  const url = new URL(`${ISSUER}/auth`);
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: callbackUrl(), response_type: 'code',
    scope: 'openid profile telegram:bot_access', state, nonce,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  }).toString();
  return { url: url.toString(), cookie: `${TX_COOKIE}=${browser}; Path=/api/reaction-stickers/telegram; Max-Age=600; HttpOnly; Secure; SameSite=Lax` };
}

function browserCookie(header: string | null) {
  return header?.split(/;\s*/).find((part) => part.startsWith(`${TX_COOKIE}=`))?.slice(TX_COOKIE.length + 1) || null;
}

export async function finishTelegramLogin(request: Request) {
  const { clientId, clientSecret, botToken } = config();
  const url = new URL(request.url);
  const state = url.searchParams.get('state'); const code = url.searchParams.get('code');
  const browser = browserCookie(request.headers.get('cookie'));
  if (!state || !code || !browser || state.length > 100 || browser.length > 100) throw new StickerUploadError(401, 'Telegram sign-in expired. Try again.');
  let raw: string | null;
  try { raw = await redisCommand<string | null>(['GETDEL', `reaction-stickers:login:${hash(state)}`]); }
  catch { throw new StickerUploadError(503, 'Telegram sign-in is temporarily unavailable.'); }
  if (!raw) throw new StickerUploadError(401, 'Telegram sign-in expired. Try again.');
  const transaction = JSON.parse(raw) as { nonce: string; verifier: string; browserHash: string };
  const left = Buffer.from(transaction.browserHash); const right = Buffer.from(hash(browser));
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new StickerUploadError(401, 'Telegram sign-in expired. Try again.');
  try {
    const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl(), client_id: clientId, code_verifier: transaction.verifier });
    const response = await fetch(`${ISSUER}/token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
      body: form, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('token exchange failed');
    const body = await response.json() as { id_token?: string };
    if (!body.id_token) throw new Error('missing identity token');
    const verified = await jwtVerify(body.id_token, JWKS, { issuer: ISSUER, audience: clientId, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub', 'nonce'] });
    const claims = verified.payload as typeof verified.payload & { id?: unknown; name?: unknown; preferred_username?: unknown; nonce?: unknown };
    const id = typeof claims.id === 'number' && Number.isSafeInteger(claims.id) ? String(claims.id) : claims.id;
    if (typeof id !== 'string' || !/^[1-9]\d{0,15}$/.test(id) || Number(id) > Number.MAX_SAFE_INTEGER ||
      claims.nonce !== transaction.nonce || typeof claims.iat !== 'number' || claims.iat > Date.now() / 1000 + 30) {
      throw new Error('identity mismatch');
    }
    const label = typeof claims.name === 'string' ? claims.name.slice(0, 80) :
      typeof claims.preferred_username === 'string' ? claims.preferred_username.slice(0, 80) : 'Telegram account';
    const botCheck = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: id }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
    });
    const botResult = await botCheck.json() as { ok?: boolean; result?: { id?: number; type?: string } };
    if (!botCheck.ok || !botResult.ok || String(botResult.result?.id) !== id || botResult.result?.type !== 'private') {
      throw new StickerUploadError(403, 'Start @stickerslopbot in Telegram, then sign in again.');
    }
    return stickerSessionCookie(createStickerSession({ id, label }));
  } catch (error) {
    if (error instanceof StickerUploadError) throw error;
    throw new StickerUploadError(401, 'Telegram sign-in could not be verified. Try again.');
  }
}
