/** Shared, single-attempt Resend transport. Never log provider bodies or request data. */
export type MailConfig = { apiKey: string; from: string };
export class MailRejectedError extends Error { constructor() { super('Mail request was rejected'); } }
export class MailConfigurationError extends MailRejectedError { constructor(message: string) { super(); this.message = message; } }
export class MailAmbiguousError extends Error { constructor() { super('Mail outcome is unknown; reconcile before retrying'); } }

export function readMailConfig(env: Record<string, string | undefined> = process.env): MailConfig {
  if ((env.MAIL_PROVIDER?.trim() || 'resend') !== 'resend') throw new MailConfigurationError('MAIL_PROVIDER must be resend');
  const apiKey = env.RESEND_SEND_API_KEY?.trim(); const address = env.RESEND_FROM_EMAIL?.trim(); const name = env.RESEND_FROM_NAME?.trim();
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new MailConfigurationError('RESEND_SEND_API_KEY is not configured or invalid');
  if (!address || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address)) throw new MailConfigurationError('RESEND_FROM_EMAIL is not configured or invalid');
  if (name && /[\r\n<>]/.test(name)) throw new MailConfigurationError('RESEND_FROM_NAME is invalid');
  return { apiKey, from: name ? `${name} <${address}>` : address };
}
export type MailMessage = {
  to: string; subject: string; html: string; text: string;
  category: 'signup-verification' | 'writing-welcome' | 'newsletter-preview' | 'legacy-transactional';
  headers?: Record<string, string>; metadata?: Record<string, string>; idempotencyKey?: string; disableTracking?: boolean; timeoutMs?: number;
};
const explicitRejections: Record<number, readonly string[]> = {
  400: ['invalid_idempotency_key', 'validation_error'], 401: ['missing_api_key', 'restricted_api_key', 'validation_error'],
  403: ['invalid_permission', 'restricted_api_key', 'suspended_api_key', 'validation_error'], 404: ['not_found'], 405: ['method_not_allowed'],
  422: ['invalid_attachment', 'invalid_parameter', 'missing_required_field', 'missing_required_parameter', 'validation_error'],
  429: ['daily_quota_exceeded', 'monthly_quota_exceeded', 'rate_limit_exceeded'],
};
export async function sendMail(message: MailMessage, options: { fetcher?: typeof fetch; config?: MailConfig } = {}): Promise<string> {
  const config = options.config ?? readMailConfig(); const headers: Record<string, string> = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  if (message.idempotencyKey) headers['Idempotency-Key'] = message.idempotencyKey;
  const body = { from: config.from, to: [message.to], subject: message.subject, html: message.html, text: message.text,
    ...(message.headers ? { headers: message.headers } : {}), tags: [ { name: 'category', value: message.category }, ...Object.entries(message.metadata ?? {}).map(([name, value]) => ({ name, value })) ] };
  let response: Response;
  try { response = await (options.fetcher ?? fetch)('https://api.resend.com/emails', { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(message.timeoutMs ?? 15000) }); }
  catch { throw new MailAmbiguousError(); }
  let receipt: Record<string, unknown>;
  try { const value: unknown = await response.json(); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); receipt = value as Record<string, unknown>; }
  catch { throw new MailAmbiguousError(); }
  if (!response.ok) { if (typeof receipt.name === 'string' && explicitRejections[response.status]?.includes(receipt.name)) throw new MailRejectedError(); throw new MailAmbiguousError(); }
  if (typeof receipt.id === 'string' && receipt.id.trim()) return receipt.id;
  throw new MailAmbiguousError();
}
