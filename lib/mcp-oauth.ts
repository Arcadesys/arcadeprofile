import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface AuthCodePayload {
  codeChallenge: string;
  codeChallengeMethod: PkceCodeChallengeMethod;
  clientId: string;
  redirectUri: string;
  state?: string;
  exp: number;
}

export type PkceCodeChallengeMethod = 'S256';

export function isSupportedPkceCodeChallengeMethod(
  value: unknown,
): value is PkceCodeChallengeMethod {
  return value === 'S256';
}

// Stateless signed auth code — no server-side session storage needed.
export function generateAuthCode(payload: AuthCodePayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAuthCode(code: string, secret: string): AuthCodePayload | null {
  const dot = code.lastIndexOf('.');
  if (dot < 0) return null;
  const data = code.slice(0, dot);
  const sig = code.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  try {
    const eBuf = Buffer.from(expected);
    const aBuf = Buffer.from(sig);
    if (eBuf.length !== aBuf.length || !timingSafeEqual(eBuf, aBuf)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as AuthCodePayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (!isSupportedPkceCodeChallengeMethod(method)) return false;
  return createHash('sha256').update(verifier).digest('base64url') === challenge;
}

/**
 * Validates an OAuth `redirect_uri` to prevent open-redirect / auth-code
 * interception. Loopback URIs (native apps, local dev — RFC 8252) are always
 * allowed; everything else must be listed in `MCP_OAUTH_ALLOWED_REDIRECT_URIS`
 * (comma-separated). An entry that is a bare origin (path `/`) whitelists any
 * path under that origin; otherwise the match is exact.
 */
export function isAllowedRedirectUri(redirectUri: string): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }

  const host = url.hostname;
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (isLoopback && (url.protocol === 'http:' || url.protocol === 'https:')) {
    return true;
  }

  const allowed = (process.env.MCP_OAUTH_ALLOWED_REDIRECT_URIS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entry of allowed) {
    if (entry === redirectUri) return true;
    try {
      const e = new URL(entry);
      if (e.origin === url.origin && (e.pathname === '/' || e.pathname === '')) return true;
    } catch {
      // ignore malformed allowlist entries
    }
  }
  return false;
}

export interface AccessTokenPayload {
  scope: 'read' | 'write';
  clientId?: string;
  exp: number;
}

// Short-lived signed access token. Never exposes the master MCP_API_KEY to
// clients; it's HMAC-signed with the key and carries its own scope + expiry so
// it can lapse without rotating the master key. `typ` guards against an auth
// code being replayed as an access token (and vice versa).
export function generateAccessToken(payload: AccessTokenPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify({ ...payload, typ: 'at' })).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `mcpt_${data}.${sig}`;
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload | null {
  if (!token.startsWith('mcpt_')) return null;
  const body = token.slice('mcpt_'.length);
  const dot = body.lastIndexOf('.');
  if (dot < 0) return null;
  const data = body.slice(0, dot);
  const sig = body.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  try {
    const eBuf = Buffer.from(expected);
    const aBuf = Buffer.from(sig);
    if (eBuf.length !== aBuf.length || !timingSafeEqual(eBuf, aBuf)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as
      & AccessTokenPayload
      & { typ?: string };
    if (payload.typ !== 'at') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (payload.scope !== 'read' && payload.scope !== 'write') return null;
    return { scope: payload.scope, clientId: payload.clientId, exp: payload.exp };
  } catch {
    return null;
  }
}

export function generateClientId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Constant-time string comparison that does not leak length. Both inputs are
 * SHA-256 hashed (always 32 bytes) before `timingSafeEqual`, so a mismatched
 * length can't short-circuit and reveal the expected secret's length.
 */
export function safeStringEqual(input: string, expected: string): boolean {
  try {
    const a = createHash('sha256').update(input).digest();
    const b = createHash('sha256').update(expected).digest();
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
