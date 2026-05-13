import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LENGTH = 8;

export const PREVIEW_TOKEN_LENGTH = TOKEN_LENGTH;
export const PREVIEW_TOKEN_PATTERN = /^[A-Za-z0-9]{8}$/;

// Rejection sampling over 256-byte values so each alphabet index is equally
// likely. 62 doesn't divide 256, so naive modulo would bias the first 8 chars.
const ACCEPT_LIMIT = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

export function generatePreviewToken(): string {
  let out = '';
  while (out.length < TOKEN_LENGTH) {
    const buf = randomBytes(TOKEN_LENGTH * 2);
    for (let i = 0; i < buf.length && out.length < TOKEN_LENGTH; i++) {
      const b = buf[i];
      if (b < ACCEPT_LIMIT) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

export function isPreviewToken(value: unknown): value is string {
  return typeof value === 'string' && PREVIEW_TOKEN_PATTERN.test(value);
}

const DEFAULT_SITE_URL = 'https://thearcades.me';

export function buildPreviewUrl(token: unknown, siteUrl?: string): string | null {
  if (!isPreviewToken(token)) return null;
  const base = (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL)
    .trim()
    .replace(/\/+$/, '');
  return `${base}/preview/${token}`;
}
