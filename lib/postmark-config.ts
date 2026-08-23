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
