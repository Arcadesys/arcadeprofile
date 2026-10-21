/** Shared, single-attempt mail transport. Never log provider bodies or request data. */
export type MailProvider = 'postmark' | 'resend';
export type MailConfig = {
  provider: MailProvider;
  apiKey: string;
  from: string;
  transactionalStream: string;
  broadcastStream: string;
};
export class MailRejectedError extends Error {
  constructor() { super('Mail request was rejected'); }
}
export class MailConfigurationError extends MailRejectedError {
  constructor(message: string) { super(); this.message = message; }
}
export class MailAmbiguousError extends Error {
  constructor() { super('Mail outcome is unknown; reconcile before retrying'); }
}

/** Resolve and validate before any ledger claim or other external mutation. */
export function readMailConfig(env: Record<string, string | undefined> = process.env): MailConfig {
  const provider = env.MAIL_PROVIDER?.trim() || 'postmark';
  if (provider !== 'postmark' && provider !== 'resend') {
    throw new MailConfigurationError('MAIL_PROVIDER must be postmark or resend');
  }
  const prefix = provider === 'resend' ? 'RESEND' : 'POSTMARK';
  const keyName = provider === 'resend' ? 'RESEND_API_KEY' : 'POSTMARK_SERVER_TOKEN';
  const apiKey = env[keyName]?.trim();
  const address = env[`${prefix}_FROM_EMAIL`]?.trim();
  const name = env[`${prefix}_FROM_NAME`]?.trim();
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new MailConfigurationError(`${keyName} is not configured or invalid`);
  if (!address || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address)) {
    throw new MailConfigurationError(`${prefix}_FROM_EMAIL is not configured or invalid`);
  }
  if (name && /[\r\n<>]/.test(name)) throw new MailConfigurationError(`${prefix}_FROM_NAME is invalid`);
  return {
    provider, apiKey, from: name ? `${name} <${address}>` : address,
    transactionalStream: env.POSTMARK_TRANSACTIONAL_STREAM?.trim() || 'outbound',
    broadcastStream: env.POSTMARK_BROADCAST_STREAM?.trim() || 'broadcast',
  };
}

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: 'signup-verification' | 'writing-welcome' | 'newsletter-preview' | 'legacy-transactional';
  stream?: 'transactional' | 'broadcast';
  headers?: Record<string, string>;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  disableTracking?: boolean;
  timeoutMs?: number;
};

// Only documented, explicit refusals release callers' durable send guards.
// 408, 409 (an earlier/in-flight keyed request may have sent), unknown errors,
// 5xx, network failures and incomplete receipts all retain those guards.
const resendRejections: Record<number, readonly string[]> = {
  400: ['invalid_idempotency_key', 'validation_error'],
  401: ['missing_api_key', 'restricted_api_key', 'validation_error'],
  403: ['invalid_permission', 'restricted_api_key', 'suspended_api_key', 'validation_error'],
  404: ['not_found'],
  405: ['method_not_allowed'],
  422: ['invalid_attachment', 'invalid_parameter', 'missing_required_field', 'missing_required_parameter', 'validation_error'],
  429: ['daily_quota_exceeded', 'monthly_quota_exceeded', 'rate_limit_exceeded'],
};

export async function sendMail(
  message: MailMessage,
  options: { fetcher?: typeof fetch; config?: MailConfig } = {},
): Promise<string> {
  const config = options.config ?? readMailConfig();
  const stream = message.stream === 'broadcast' ? config.broadcastStream : config.transactionalStream;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  let body: Record<string, unknown>;
  if (config.provider === 'postmark') {
    headers['X-Postmark-Server-Token'] = config.apiKey;
    body = {
      From: config.from, To: message.to, Subject: message.subject,
      HtmlBody: message.html, TextBody: message.text, MessageStream: stream,
      ...(message.disableTracking ? { TrackLinks: 'None', TrackOpens: false } : {}),
      ...(message.headers ? { Headers: Object.entries(message.headers).map(([Name, Value]) => ({ Name, Value })) } : {}),
      ...(message.metadata ? { Metadata: message.metadata } : {}),
    };
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
    if (message.idempotencyKey) headers['Idempotency-Key'] = message.idempotencyKey;
    body = {
      from: config.from, to: [message.to], subject: message.subject,
      html: message.html, text: message.text,
      ...(message.headers ? { headers: message.headers } : {}),
      tags: [
        { name: 'category', value: message.category },
        { name: 'message_stream', value: stream },
        ...Object.entries(message.metadata ?? {}).map(([name, value]) => ({ name, value })),
      ],
    };
  }
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(config.provider === 'postmark'
      ? 'https://api.postmarkapp.com/email' : 'https://api.resend.com/emails', {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(message.timeoutMs ?? 15000),
    });
  } catch { throw new MailAmbiguousError(); }
  if (config.provider === 'postmark' && response.status >= 400 && response.status < 500) throw new MailRejectedError();
  let receipt: Record<string, unknown>;
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    receipt = value as Record<string, unknown>;
  } catch { throw new MailAmbiguousError(); }
  if (config.provider === 'resend' && !response.ok) {
    if (typeof receipt.name === 'string' && resendRejections[response.status]?.includes(receipt.name)) throw new MailRejectedError();
    throw new MailAmbiguousError();
  }
  if (!response.ok) throw new MailAmbiguousError();
  if (config.provider === 'postmark') {
    if (typeof receipt.ErrorCode !== 'number' || !Number.isInteger(receipt.ErrorCode)) throw new MailAmbiguousError();
    if (receipt.ErrorCode !== 0) throw new MailRejectedError();
    if (typeof receipt.MessageID === 'string' && receipt.MessageID.trim()) return receipt.MessageID;
  } else if (typeof receipt.id === 'string' && receipt.id.trim()) return receipt.id;
  throw new MailAmbiguousError();
}
