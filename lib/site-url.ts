/**
 * Canonical absolute site URL — used by metadata, sitemap, robots, and
 * any SSR code that needs to emit absolute links. Trailing slashes are
 * stripped so callers can concatenate `${SITE_URL}${path}` safely.
 *
 * Falls back to the production domain when `NEXT_PUBLIC_SITE_URL` is
 * unset (build-time previews, local dev without env wiring, etc.).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me'
).replace(/\/+$/, '');
