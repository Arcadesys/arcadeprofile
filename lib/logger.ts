import pino, { type Logger } from 'pino';

/**
 * App-wide structured logger.
 *
 * Writes JSON to stdout (collected by Vercel log drains in prod).
 * Redacts common sensitive keys so a stray `logger.error({ user })` or
 * `logger.warn({ headers })` doesn't leak emails, bearer tokens, or
 * cookies into the log stream.
 *
 * Usage convention: pass structured fields, not interpolated strings —
 *   logger.error({ err, audience }, 'AC subscribe failed')
 * — so redaction can match on property paths.
 */

// pino's redact uses fast-redact, which supports `*` (single-level) but NOT
// `**` (recursive). Verified: ['**.email'] silently fails to redact deeply
// nested email properties. Each sensitive key is therefore listed at root,
// at one level deep (`*.X`), and on the request/headers paths we actually
// log. If we add a third level of nesting in a log payload, list it here.
const REDACT_KEYS = [
  'email',
  'to',
  'from',
  'authorization',
  'cookie',
  'cookies',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'password',
  'hash',
  'salt',
  'secret',
];

const REDACT_PATHS = [
  ...REDACT_KEYS,
  ...REDACT_KEYS.map((k) => `*.${k}`),
  'headers.authorization',
  'headers.cookie',
  'request.headers.authorization',
  'request.headers.cookie',
];

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  base: {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  },
});
