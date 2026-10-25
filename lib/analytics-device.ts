/** Coarse inference from the request UA already forwarded by the receiver.
 * No fingerprint, viewport, browser version, or new client identifier.
 */
export function analyticsDeviceType(userAgent: string | null): 'Desktop' | 'Mobile' | 'Tablet' | undefined {
  if (!userAgent || userAgent.length > 4096 || /bot|spider|crawler|headless|playwright|puppeteer|curl\/|python-requests/i.test(userAgent)) return undefined;
  if (/ipad|tablet/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) return 'Tablet';
  if (/iphone|ipod|windows phone/i.test(userAgent) || (/android/i.test(userAgent) && /mobile/i.test(userAgent))) return 'Mobile';
  if (!/android|mobile/i.test(userAgent) && /windows nt|macintosh|x11|cros/i.test(userAgent)) return 'Desktop';
  return undefined;
}
