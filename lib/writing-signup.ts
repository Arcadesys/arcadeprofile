import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Audience } from './subscribe-types';

export type SignupChallenge = {
  encryptedEmail?: string;
  emailDigest?: string;
  audiences: Audience[];
  source?: string | null;
  createdAt: number;
  verifiedAt?: number;
  processingUntil?: number;
  processingToken?: string;
  subscriberId?: number;
  status: 'pending' | 'processing' | 'awaiting-kit' | 'complete' | 'blocked' | 'cancelled';
};

const TTL_SECONDS = 60 * 60 * 24;
const audiences: Audience[] = ['all', 'fiction', 'essays', 'lab'];

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function redisUrl() {
  const base = (process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim());
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim());
  if (!base || !token) throw new Error('Upstash Redis REST credentials are not configured');
  return { base: base.replace(/\/+$/, ''), token };
}

export async function redisCommand<T>(command: unknown[], fetcher: typeof fetch = fetch): Promise<T> {
  const { base, token } = redisUrl();
  const response = await fetcher(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Signup ledger unavailable');
  const body = await response.json() as { result?: T; error?: string };
  if (body.error) throw new Error('Signup ledger command failed');
  return body.result as T;
}

function signingSecret() {
  const value = env('SIGNUP_LINK_SECRET');
  if (value.length < 32) throw new Error('SIGNUP_LINK_SECRET must be at least 32 characters');
  return value;
}
function sign(value: string) { return createHmac('sha256', signingSecret()).update(value).digest('base64url'); }

export function encryptSignupEmail(email: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(signingSecret()).digest(), iv);
  const ciphertext = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

export function decryptSignupEmail(encryptedEmail: string) {
  const packed = Buffer.from(encryptedEmail, 'base64url');
  if (packed.length < 29) throw new Error('Signup email ciphertext is invalid');
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(signingSecret()).digest(), packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
}

/** Stable keyed identifier for one address, without storing the address itself. */
export function signupEmailDigest(email: string) {
  return createHmac('sha256', signingSecret()).update(`writing-email\n${email.trim().toLowerCase()}`).digest('hex');
}

export function createKitUnsubscribeToken(subscriberId: number, emailDigest: string) {
  if (!Number.isSafeInteger(subscriberId) || subscriberId <= 0 || !/^[a-f0-9]{64}$/.test(emailDigest)) throw new Error('Unsubscribe identity is invalid');
  const payload = `${subscriberId}.${emailDigest}`;
  return `${payload}.${sign(`unsubscribe:${payload}`)}`;
}

export function parseKitUnsubscribeToken(token: string) {
  if (token.length > 256) return null;
  const [idText, emailDigest, signature, extra] = token.split('.');
  const subscriberId = Number(idText);
  if (!idText || !Number.isSafeInteger(subscriberId) || subscriberId <= 0 || !emailDigest || !/^[a-f0-9]{64}$/.test(emailDigest) || !signature || extra) return null;
  const expected = Buffer.from(sign(`unsubscribe:${idText}.${emailDigest}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { subscriberId, emailDigest };
}

export function createVerificationToken(id: string, expiresAt: number) {
  const payload = `${id}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function parseVerificationToken(token: string, now = Date.now()): { id: string; expiresAt: number } | null {
  if (token.length > 256) return null;
  const [id, expText, signature, extra] = token.split('.');
  if (!id || !/^[a-f0-9]{32}$/.test(id) || !expText || !signature || extra) return null;
  const expiresAt = Number(expText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now - 31 * 24 * 60 * 60 * 1000 || expiresAt > now + TTL_SECONDS * 1000 + 60000) return null;
  const expected = Buffer.from(sign(`${id}.${expText}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id, expiresAt };
}

export async function putChallenge(id: string, challenge: SignupChallenge, fetcher: typeof fetch = fetch) {
  const result = await redisCommand<string | null>(['SET', `writing:challenge:${id}`, JSON.stringify(challenge), 'EX', TTL_SECONDS, 'NX'], fetcher);
  if (result !== 'OK') throw new Error('Could not create signup request');
}

export async function getChallenge(id: string, fetcher: typeof fetch = fetch): Promise<SignupChallenge | null> {
  const value = await redisCommand<string | null>(['GET', `writing:challenge:${id}`], fetcher);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as SignupChallenge;
    if (!parsed || !Array.isArray(parsed.audiences) || parsed.audiences.length === 0 ||
      parsed.audiences.some((audience) => !audiences.includes(audience))) return null;
    return parsed;
  } catch { return null; }
}

export async function saveChallengeIfStatus(
  id: string,
  challenge: SignupChallenge,
  expectedStatus: SignupChallenge['status'],
  expectedProcessingToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<'updated' | SignupChallenge['status'] | 'missing'> {
  const retentionEnd = challenge.verifiedAt ? challenge.verifiedAt + 30 * 24 * 60 * 60 * 1000 : challenge.createdAt + TTL_SECONDS * 1000;
  const ttl = ['processing', 'awaiting-kit'].includes(challenge.status)
    ? Math.max(1, Math.ceil((retentionEnd - Date.now()) / 1000))
    : 0;
  const script = `local raw=redis.call('GET',KEYS[1]); if not raw then return 'missing' end; local current=cjson.decode(raw); if current.status~=ARGV[1] then return current.status end; if ARGV[6]~='' and current.processingToken~=ARGV[6] then return 'lease_mismatch' end; redis.call('SET',KEYS[1],ARGV[2],'KEEPTTL'); if tonumber(ARGV[3])>0 then redis.call('EXPIRE',KEYS[1],ARGV[3]) end; if ARGV[4]=='awaiting-kit' then redis.call('SADD',KEYS[2],ARGV[5]) else redis.call('SREM',KEYS[2],ARGV[5]) end; return 'updated'`;
  const result = await redisCommand<string>(['EVAL', script, 2, `writing:challenge:${id}`, challengeIndexKey(), expectedStatus, JSON.stringify(challenge), ttl, challenge.status, id, expectedProcessingToken ?? ''], fetcher);
  if (result === 'updated' || result === 'missing' || ['pending', 'processing', 'awaiting-kit', 'complete', 'blocked', 'cancelled'].includes(result)) return result as 'updated' | SignupChallenge['status'] | 'missing';
  throw new Error('Signup ledger status was invalid');
}

export function challengeIndexKey() { return 'writing:awaiting-kit'; }
export function audienceList(input: Audience[]) { return [...new Set(input)].filter((value) => audiences.includes(value)); }

export async function lookupKitSubscriber(email: string, apiKey: string, fetcher: typeof fetch = fetch) {
  const url = new URL('https://api.kit.com/v4/subscribers');
  url.searchParams.set('email_address', email);
  url.searchParams.set('status', 'all');
  url.searchParams.set('slim', 'true');
  url.searchParams.set('per_page', '10');
  const response = await fetcher(url, { headers: { 'X-Kit-Api-Key': apiKey }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!response.ok) throw new Error('Kit subscriber lookup failed');
  const body = await response.json() as { subscribers?: Array<{ id?: unknown; state?: unknown; email_address?: unknown }> };
  if (!Array.isArray(body.subscribers)) throw new Error('Kit subscriber response was invalid');
  const matches = body.subscribers.filter((entry) => typeof entry.email_address === 'string' && entry.email_address.toLowerCase() === email.toLowerCase());
  if (matches.length > 1) throw new Error('Kit subscriber response was ambiguous');
  const found = matches[0];
  if (!found) return null;
  if (typeof found.id !== 'number' || !Number.isSafeInteger(found.id) || found.id <= 0 || typeof found.state !== 'string') {
    throw new Error('Kit subscriber response was invalid');
  }
  return { id: found.id, state: found.state };
}

export async function sendVerificationEmail(input: { email: string; token: string; audiences: Audience[] }, fetcher: typeof fetch = fetch) {
  const serverToken = env('POSTMARK_SERVER_TOKEN');
  const from = env('POSTMARK_FROM_EMAIL');
  const site = verificationSiteUrl();
  const labels: Record<Audience, string> = { all: 'All writing', fiction: 'Fiction', essays: 'Essays', lab: "The Arcades' Lab" };
  const selected = input.audiences.map((audience) => labels[audience]);
  const verifyUrl = `${site}/subscribe/verify#${input.token}`;
  const html = `<p>You asked to receive: <strong>${selected.join(', ')}</strong>.</p><p><a href="${verifyUrl}">Confirm your subscription</a></p><p>This link expires in 24 hours. If you didn’t request this, you can ignore this email.</p>`;
  const text = `You asked to receive: ${selected.join(', ')}.\n\nConfirm your subscription: ${verifyUrl}\n\nThis link expires in 24 hours. If you didn’t request this, you can ignore this email.`;
  const response = await fetcher('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'X-Postmark-Server-Token': serverToken, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      From: process.env.POSTMARK_FROM_NAME?.trim() ? `${process.env.POSTMARK_FROM_NAME.trim()} <${from}>` : from,
      To: input.email,
      Subject: 'Confirm your subscription to The Arcades',
      HtmlBody: html,
      TextBody: text,
      MessageStream: process.env.POSTMARK_TRANSACTIONAL_STREAM?.trim() || 'outbound',
      TrackLinks: 'None',
      TrackOpens: false,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status >= 400 && response.status < 500) throw new PostmarkRejectedError();
  if (!response.ok) throw new Error('Postmark delivery result is ambiguous');
  let receipt: { ErrorCode?: unknown; MessageID?: unknown };
  try { receipt = await response.json() as { ErrorCode?: unknown; MessageID?: unknown }; }
  catch { throw new Error('Postmark delivery receipt was invalid'); }
  if (receipt.ErrorCode !== 0) throw new PostmarkRejectedError();
  if (typeof receipt.MessageID !== 'string' || !receipt.MessageID) throw new Error('Postmark delivery receipt was incomplete');
}

export function verificationSiteUrl() {
  if (process.env.VERCEL_ENV === 'preview') {
    const deploymentHost = process.env.VERCEL_URL?.trim();
    if (!deploymentHost || !/^[a-z0-9][a-z0-9.-]*\.vercel\.app$/i.test(deploymentHost)) {
      throw new Error('A trusted preview deployment URL is not configured');
    }
    return `https://${deploymentHost}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.thearcades.me').replace(/\/+$/, '');
}

export function newChallengeId() { return randomBytes(16).toString('hex'); }
export function newProcessingToken() { return randomBytes(24).toString('base64url'); }
export async function releaseSignupLock(key: string, value: string, fetcher: typeof fetch = fetch) {
  const script = `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`;
  await redisCommand(['EVAL', script, 1, key, value], fetcher);
}
export const challengeTtlMilliseconds = TTL_SECONDS * 1000;
export function signupCooldownKey(email: string, selected: Audience[]) {
  const digest = createHmac('sha256', signingSecret()).update(`${email.toLowerCase()}\n${[...selected].sort().join(',')}`).digest('hex');
  return `writing:send-cooldown:${digest}`;
}

export class PostmarkRejectedError extends Error {
  constructor() { super('Verification email was rejected'); }
}
