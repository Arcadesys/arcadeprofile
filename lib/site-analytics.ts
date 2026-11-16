import publicPaths from '@/data/analytics-public-paths.json';
import readerPaths from '@/data/analytics-reader-paths.json';
import { SITE_URL } from '@/lib/site-url';
import type { BeforeSendEvent } from '@vercel/analytics';

const PUBLIC_PATHS = new Set(publicPaths);
const READER_PATHS = new Set<string>(readerPaths);
export const ANALYTICS_ORIGIN = SITE_URL;

/** Exact source-owned routes only; encoded, private and unknown paths fail closed. */
export function publicAnalyticsPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512 || !/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/.test(value)) return null;
  const path = value === '/' ? value : value.replace(/\/$/, '');
  return PUBLIC_PATHS.has(path) ? path : null;
}

export function shouldTrackSiteAnalytics(pathname: string) {
  return publicAnalyticsPath(pathname) !== null;
}

/** Exact same-origin PDF child of a public reader; PDF routes stay pageview-ineligible. */
export function isPublicReaderPdfDestination(sourcePath: unknown, targetPath: unknown, sourceOrigin: unknown, targetOrigin: unknown) {
  return typeof sourcePath === 'string' && typeof targetPath === 'string'
    && typeof sourceOrigin === 'string' && sourceOrigin === targetOrigin
    && READER_PATHS.has(sourcePath) && publicAnalyticsPath(sourcePath) === sourcePath
    && targetPath === `${sourcePath}/pdf`;
}

export function buildSiteAnalyticsContext(pathname: string, currentUrl: string) {
  const path = publicAnalyticsPath(pathname);
  if (!path) return null;
  try {
    const url = new URL(currentUrl);
    if (url.origin !== ANALYTICS_ORIGIN || url.username || url.password || publicAnalyticsPath(url.pathname) !== path) return null;
    return { pathname: path, $pathname: path, $host: url.hostname, $current_url: `${ANALYTICS_ORIGIN}${path}` };
  } catch {
    return null;
  }
}

export function isProductionAnalyticsEnvironment(nodeEnv: string | undefined, deploymentEnv: string | undefined) {
  return nodeEnv === 'production' && (!deploymentEnv || deploymentEnv === 'production');
}

/** Public env is optional on real production; preview hosts are independently denied. */
export function canCaptureBrowserAnalytics(currentUrl = typeof window === 'undefined' ? '' : window.location.href) {
  if (!isProductionAnalyticsEnvironment(process.env.NODE_ENV, process.env.NEXT_PUBLIC_VERCEL_ENV)) return false;
  if (typeof window !== 'undefined' && window.navigator.doNotTrack === '1') return false;
  try {
    const url = new URL(currentUrl);
    return buildSiteAnalyticsContext(url.pathname, currentUrl) !== null;
  } catch {
    return false;
  }
}

/** Also installed by the reader's early SDK injection, before any reader effects. */
export function sanitizeVercelAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (!canCaptureBrowserAnalytics() || !canCaptureBrowserAnalytics(event.url)) return null;
  const url = new URL(event.url);
  const path = publicAnalyticsPath(url.pathname);
  return path ? { ...event, url: `${ANALYTICS_ORIGIN}${path}` } : null;
}
