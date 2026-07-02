import { createHash, timingSafeEqual } from 'crypto';

// Hash both sides to a fixed 32-byte length before comparing, so a length
// mismatch can't short-circuit and leak the secret's length via timing.
export function safeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export function tokenFromAuthorization(header: string | null): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(/\s+/, 2);
  if (!scheme || !value) return null;

  if (scheme.toLowerCase() === 'bearer') return value.trim() || null;

  if (scheme.toLowerCase() === 'basic') {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator < 0) return null;
      const username = decoded.slice(0, separator);
      const password = decoded.slice(separator + 1);
      return password || username || null;
    } catch {
      return null;
    }
  }

  return null;
}

export type PostmarkWebhookAuthResult =
  | { ok: true }
  | { ok: false; status: 403 | 500; error: string };

export function evaluatePostmarkWebhookAuth(options: {
  secret: string | undefined;
  authorizationHeader: string | null;
  tokenHeader: string | null;
  isProduction: boolean;
}): PostmarkWebhookAuthResult {
  const secret = options.secret?.trim();
  if (!secret) {
    if (options.isProduction) {
      return { ok: false, status: 500, error: 'POSTMARK_WEBHOOK_SECRET is not configured.' };
    }
    return { ok: true };
  }

  const token =
    tokenFromAuthorization(options.authorizationHeader) ?? options.tokenHeader?.trim() ?? null;
  if (!token || !safeEqual(token, secret)) {
    // Postmark stops webhook retries on 403, which is what we want for bad auth.
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true };
}
