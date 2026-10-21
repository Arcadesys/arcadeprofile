import { MailRejectedError } from './mail-transport';
import { isArcadesAudience } from './subscription-audiences';
import { VALID_AUDIENCES, type Audience } from './subscribe-types';
import { newProcessingToken, redisCommand, signupEmailDigest } from './writing-signup';
import { sendWelcomeContent, writingWelcomeSenderConfig, type WelcomeDeliveryResult } from './writing-welcome-email';
import { buildWelcomeSeriesEmail } from './welcome-series-copy';
import { lookupResendContactById } from './resend-contacts';

const DAY = 86400000;
const RETENTION = 30 * DAY;
const LEASE = 120000;
const OFFSETS = [0, 3 * DAY, 7 * DAY];
const INDEX = 'writing:welcome-series:due';
const key = (digest: string) => `writing:welcome-series:${digest}`;
type Status = 'pending' | 'claimed' | 'sending' | 'uncertain';
export type SeriesRecord = {
  subscriberId: string;
  audiences: Audience[];
  step: number;
  enrolledAt: number;
  nextDue: number;
  expiresAt: number;
  status: Status;
  claim?: string;
  leaseUntil?: number;
};
type Context = { apiKey: string; fetcher?: typeof fetch; clock?: () => number };
type Result = WelcomeDeliveryResult | 'stopped' | 'deferred';

export function welcomeSeriesEnabled() {
  return process.env.WELCOME_SERIES_ENABLED?.trim().toLowerCase() === 'true'
    && process.env.WRITING_WELCOME_ENABLED?.trim().toLowerCase() !== 'true';
}

// The legacy permanent welcome key is the migration-safe once-per-address marker.
const ENROLL = `-- welcome-series-enroll-v1
if redis.call('EXISTS',KEYS[1])==1 then return 0 end
redis.call('SET',KEYS[1],'series:v1')
redis.call('SET',KEYS[2],ARGV[1],'PX',ARGV[2])
redis.call('ZADD',KEYS[3],ARGV[3],ARGV[4])
return 1`;

// Every transition, including index changes, is a single compare-and-set. A stale
// worker cannot send or advance a step after another worker has replaced its lease.
const TRANSITION = `-- welcome-series-cas-v1
if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
if ARGV[2]=='' then
  redis.call('DEL',KEYS[1]); redis.call('ZREM',KEYS[2],ARGV[5])
else
  redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3])
  if ARGV[4]=='hold' then redis.call('ZREM',KEYS[2],ARGV[5])
  else redis.call('ZADD',KEYS[2],ARGV[4],ARGV[5]) end
end
return 1`;

function readRecord(raw: string): SeriesRecord {
  const r = JSON.parse(raw) as SeriesRecord;
  if (typeof r.subscriberId !== 'string' || !/^[a-f0-9-]{20,64}$/i.test(r.subscriberId) || !Array.isArray(r.audiences)
    || !r.audiences.length || r.audiences.some((a) => !VALID_AUDIENCES.includes(a))
    || !r.audiences.some(isArcadesAudience) || !Number.isInteger(r.step) || r.step < 0 || r.step > 2
    || !Number.isFinite(r.enrolledAt) || !Number.isFinite(r.nextDue) || !Number.isFinite(r.expiresAt)
    || r.expiresAt !== r.enrolledAt + RETENTION || !['pending', 'claimed', 'sending', 'uncertain'].includes(r.status)
    || (['claimed', 'sending'].includes(r.status) && (typeof r.claim !== 'string' || !Number.isFinite(r.leaseUntil)))) {
    throw new Error('Invalid welcome series record');
  }
  return r;
}

async function transition(digest: string, raw: string, next: SeriesRecord | null, context: Context) {
  const now = (context.clock ?? Date.now)();
  const live = next && next.expiresAt > now ? next : null;
  const score = live?.status === 'uncertain' ? 'hold' : live?.leaseUntil ?? live?.nextDue ?? 'hold';
  return await redisCommand<number>(['EVAL', TRANSITION, 2, key(digest), INDEX, raw,
    live ? JSON.stringify(live) : '', live ? Math.max(1, live.expiresAt - now) : 1, score, digest], context.fetcher) === 1;
}

async function recipient(subscriberId: string, digest: string, context: Context) {
  const subscriber = await lookupResendContactById(subscriberId, context.apiKey, context.fetcher);
  if (!subscriber || subscriber.unsubscribed) return null;
  const email = subscriber.email.trim().toLowerCase();
  // Address changes require a fresh explicit consent flow; never redirect a series.
  if (!email || !email.includes('@') || signupEmailDigest(email) !== digest) return null;
  return email;
}

/** Called only after first-party confirmation and a subscribed Resend contact.
 * Imported contacts never enter by bulk enumeration.
 */
export async function enrollWelcomeSeries(input: { subscriberId: string; emailDigest: string; audiences: Audience[] } & Context): Promise<Result> {
  if (!welcomeSeriesEnabled()) return 'disabled';
  if (!input.audiences.some(isArcadesAudience)) return 'disabled';
  if (!/^[a-f0-9]{64}$/.test(input.emailDigest) || !/^[a-f0-9-]{20,64}$/i.test(input.subscriberId)
    || input.audiences.some((a) => !VALID_AUDIENCES.includes(a))) throw new Error('Invalid welcome enrollment');
  if (!input.apiKey.trim()) throw new Error('Resend is not configured');
  writingWelcomeSenderConfig();
  buildWelcomeSeriesEmail(0, 'https://www.thearcades.me/subscribe/unsubscribe');
  if (!await recipient(input.subscriberId, input.emailDigest, input)) return 'stopped';
  const now = (input.clock ?? Date.now)();
  const record: SeriesRecord = { subscriberId: input.subscriberId, audiences: [...new Set(input.audiences)], step: 0,
    enrolledAt: now, nextDue: now, expiresAt: now + RETENTION, status: 'pending' };
  const created = await redisCommand<number>(['EVAL', ENROLL, 3, `writing:welcome:${input.emailDigest}`, key(input.emailDigest), INDEX,
    JSON.stringify(record), RETENTION, now, input.emailDigest], input.fetcher);
  if (created !== 1) return 'already-claimed';
  return processWelcomeSeriesStep(input.emailDigest, input);
}

export async function processWelcomeSeriesStep(digest: string, context: Context): Promise<Result> {
  if (!welcomeSeriesEnabled()) return 'disabled';
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid welcome digest');
  writingWelcomeSenderConfig();
  const clock = context.clock ?? Date.now;
  const fetcher = context.fetcher ?? fetch;
  let raw = await redisCommand<string | null>(['GET', key(digest)], fetcher);
  if (!raw) { await redisCommand(['ZREM', INDEX, digest], fetcher); return 'stopped'; }
  let record: SeriesRecord;
  try { record = readRecord(raw); }
  catch { await transition(digest, raw, null, context); return 'stopped'; }
  const now = clock();
  if (now >= record.expiresAt) { await transition(digest, raw, null, context); return 'stopped'; }
  if (record.status === 'uncertain') return 'uncertain';
  if (record.status === 'sending') {
    if (now < record.leaseUntil!) return 'already-claimed';
    await transition(digest, raw, { ...record, status: 'uncertain' }, context);
    return 'uncertain';
  }
  if (record.nextDue > now || (record.status === 'claimed' && now < record.leaseUntil!)) return 'deferred';
  record = { ...record, status: 'claimed', claim: newProcessingToken(), leaseUntil: now + LEASE };
  if (!await transition(digest, raw, record, context)) return 'already-claimed';
  raw = JSON.stringify(record);
  // Before the durable 'sending' transition, no mail request is possible.
  let email: string | null;
  try { email = await recipient(record.subscriberId, digest, context); }
  catch {
    await transition(digest, raw, { ...record, status: 'pending', claim: undefined, leaseUntil: undefined, nextDue: clock() + DAY }, context);
    return 'deferred';
  }
  if (!email) { await transition(digest, raw, null, context); return 'stopped'; }
  if (!welcomeSeriesEnabled() || clock() >= record.leaseUntil!) return 'deferred';
  const sending: SeriesRecord = { ...record, status: 'sending' };
  if (!await transition(digest, raw, sending, context)) return 'already-claimed';
  raw = JSON.stringify(sending);
  try {
    await sendWelcomeContent({ email, subscriberId: record.subscriberId, emailDigest: digest, fetcher,
      idempotencyKey: `welcome-series/${digest}/step-${record.step}`,
      buildContent: (url) => buildWelcomeSeriesEmail(record.step, url) });
  } catch (error) {
    if (error instanceof MailRejectedError) {
      await transition(digest, raw, { ...record, status: 'pending', claim: undefined, leaseUntil: undefined, nextDue: clock() + DAY }, context);
      return 'rejected';
    }
    // Timeout, malformed receipt, 5xx: hold indefinitely until record TTL, never
    // auto-reclaim a possibly accepted send. The durable address marker survives.
    await transition(digest, raw, { ...sending, status: 'uncertain' }, context);
    return 'uncertain';
  }
  const next: SeriesRecord | null = record.step === 2 ? null : { ...record, step: record.step + 1,
    nextDue: record.enrolledAt + OFFSETS[record.step + 1], status: 'pending', claim: undefined, leaseUntil: undefined };
  // A lost Redis acknowledgement after acceptance remains sending/uncertain;
  // retrying the cron cannot resend that mail attempt.
  return await transition(digest, raw, next, context) ? 'sent' : 'uncertain';
}

export async function runDueWelcomeSeries(context: Context) {
  const result = { checked: 0, sent: 0, stopped: 0, uncertain: 0, deferred: 0, failed: 0 };
  if (!welcomeSeriesEnabled()) return result;
  const ids = await redisCommand<string[]>(['ZRANGEBYSCORE', INDEX, '-inf', (context.clock ?? Date.now)(), 'LIMIT', 0, 50], context.fetcher);
  if (!Array.isArray(ids)) throw new Error('Invalid welcome queue');
  for (const digest of ids) {
    if (!/^[a-f0-9]{64}$/.test(digest)) { await redisCommand(['ZREM', INDEX, digest], context.fetcher); continue; }
    result.checked += 1;
    try {
      const delivered = await processWelcomeSeriesStep(digest, context);
      if (delivered === 'sent') result.sent += 1;
      if (delivered === 'stopped') result.stopped += 1;
      if (delivered === 'uncertain') result.uncertain += 1;
      if (delivered === 'deferred') result.deferred += 1;
      if (delivered === 'rejected') result.failed += 1;
    } catch { result.failed += 1; }
  }
  return result;
}
