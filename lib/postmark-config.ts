/**
 * Typed, validated Postmark/newsletter configuration.
 *
 * Centralizes the env-var reads that were scattered through `lib/postmark.ts`
 * and fixes two production foot-guns confirmed in the field:
 *   1. the broadcast stream silently defaulting to the transactional stream
 *      (`outbound`), sending bulk mail on the wrong rail; and
 *   2. a hardcoded From-address fallback masking a missing `POSTMARK_FROM_EMAIL`
 *      in production.
 */

const DEV_FROM_EMAIL_FALLBACK = 'austen@thearcades.me';

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function getPostmarkServerToken(): string | undefined {
  return firstNonEmpty(process.env.POSTMARK_SERVER_TOKEN);
}

export function getPostmarkTransactionalMessageStream(): string {
  return firstNonEmpty(process.env.POSTMARK_TRANSACTIONAL_STREAM) ?? 'outbound';
}

/**
 * Broadcast (bulk newsletter) stream. Defaults to `'broadcast'` — matching
 * `.env.example` — so an unset env never silently routes bulk mail onto the
 * transactional stream.
 */
export function getPostmarkBroadcastMessageStream(): string {
  return (
    firstNonEmpty(process.env.POSTMARK_BROADCAST_STREAM, process.env.POSTMARK_NEWSLETTER_STREAM) ??
    'broadcast'
  );
}

export function getFromEmail(): string {
  const configured = firstNonEmpty(process.env.POSTMARK_FROM_EMAIL);
  if (configured) return configured;
  if (isProductionRuntime()) {
    throw new NewsletterConfigError('POSTMARK_FROM_EMAIL is required in production.');
  }
  return DEV_FROM_EMAIL_FALLBACK;
}

export function getFromName(): string {
  return firstNonEmpty(process.env.POSTMARK_FROM_NAME) ?? 'The Arcades';
}

export function formatFromAddress(): string {
  const email = getFromEmail();
  const name = getFromName().trim();
  return name ? `${name} <${email}>` : email;
}

export class NewsletterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsletterConfigError';
  }
}

const AC_PERPOST_LIST_ENV = [
  'AC_LIST_ID_ALL_PERPOST',
  'AC_LIST_ID_FICTION_PERPOST',
  'AC_LIST_ID_ESSAYS_PERPOST',
] as const;

/**
 * Throw with a clear, combined message if the newsletter rail is misconfigured,
 * so `deliverPostNewsletter` records `status: failed` with a useful `lastError`
 * instead of silently sending on the wrong stream (or not at all).
 *
 * Always enforced in production; in non-prod, enforced only when
 * `POSTMARK_REQUIRED_IN_PROD=true` so local dev without Postmark still boots.
 */
export function assertNewsletterConfigValid(): void {
  const enforced = isProductionRuntime() || process.env.POSTMARK_REQUIRED_IN_PROD === 'true';
  if (!enforced) return;

  const missing: string[] = [];
  if (!getPostmarkServerToken()) missing.push('POSTMARK_SERVER_TOKEN');
  if (!firstNonEmpty(process.env.POSTMARK_FROM_EMAIL)) missing.push('POSTMARK_FROM_EMAIL');
  if (!firstNonEmpty(process.env.AC_API_URL, process.env.ACTIVECAMPAIGN_API_URL))
    missing.push('AC_API_URL');
  if (!firstNonEmpty(process.env.AC_API_KEY, process.env.ACTIVECAMPAIGN_API_KEY))
    missing.push('AC_API_KEY');
  for (const name of AC_PERPOST_LIST_ENV) {
    if (!firstNonEmpty(process.env[name])) missing.push(name);
  }

  if (missing.length > 0) {
    throw new NewsletterConfigError(
      `Newsletter delivery is misconfigured — missing env: ${missing.join(', ')}.`,
    );
  }

  // Bulk newsletters must never go out the transactional stream.
  const broadcast = getPostmarkBroadcastMessageStream();
  const transactional = getPostmarkTransactionalMessageStream();
  if (broadcast === transactional) {
    throw new NewsletterConfigError(
      `Broadcast stream ("${broadcast}") must differ from the transactional stream — ` +
        'set POSTMARK_BROADCAST_STREAM to a Postmark Broadcasts stream.',
    );
  }
}
