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

const REDACT_PATHS = [
  'email',
  'authorization',
  'cookie',
  'cookies',
  'token',
  'apiKey',
  'password',
  'hash',
  'salt',
  '*.email',
  '*.authorization',
  '*.cookie',
  '*.cookies',
  '*.token',
  '*.apiKey',
  '*.password',
  '*.hash',
  '*.salt',
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
