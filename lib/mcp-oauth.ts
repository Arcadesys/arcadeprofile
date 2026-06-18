import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface AuthCodePayload {
  codeChallenge: string;
  codeChallengeMethod: string;
  clientId: string;
  redirectUri: string;
  state?: string;
  exp: number;
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
  if (method === 'S256') {
    return createHash('sha256').update(verifier).digest('base64url') === challenge;
  }
  return verifier === challenge;
}

export function generateClientId(): string {
  return randomBytes(16).toString('hex');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
