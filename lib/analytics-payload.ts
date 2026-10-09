import mffLabels from '@/data/analytics-mff-labels.json';
import { ANALYTICS_ORIGIN, buildSiteAnalyticsContext, publicAnalyticsPath } from '@/lib/site-analytics';
import { VALID_SOURCES } from '@/lib/subscribe-types';
import { POST_CANONICAL_EDITIONS } from '@/lib/post-canonical';
import { isAnalyticsSessionId } from '@/lib/analytics-session';
import { sanitizeEngagement } from '@/lib/reading-engagement';

export type AnalyticsSurface = 'sitewide' | 'mff_manifesto';
export type AnalyticsProperties = Record<string, string | number | boolean>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMPAIGN = /^[a-z0-9_-]{1,64}$/;
const SITE_EVENTS = new Set(['$pageview', 'site link clicked', 'reading-start', 'end-reached', 'onward-reading', 'resume-click', 'signup confirmation requested', 'signup request submitted', 'signup request failed', 'reading-engagement']);
const MFF_EVENTS = new Set(['$pageview', 'mff page viewed', 'mff scroll reached', 'mff section viewed', 'mff exhibit viewed', 'mff link clicked', 'mff sources opened']);
const READER_TYPES = new Set(['essay', 'fiction', 'chapter', 'reading-hub', 'subscription']);
const READER_PLACEMENTS = new Set<string>([...VALID_SOURCES, 'reader-body', 'reader-end', 'next-chapter', 'recommended-reading', 'resume-banner']);

export function isAnalyticsId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function analyticsRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeOrigin(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}

export function sanitizeEntryContext(value: unknown, surface: AnalyticsSurface = 'sitewide'): AnalyticsProperties {
  const input = analyticsRecord(value);
  if (!input) return {};
  const result: AnalyticsProperties = {};
  const landing = publicAnalyticsPath(input.landing_page);
  if (landing) result.landing_page = landing;
  const referrer = safeOrigin(input.$referrer);
  if (referrer) {
    result.$referrer = referrer.origin;
    if (surface === 'sitewide') result.referring_domain = referrer.hostname;
  }
  const keys = surface === 'sitewide' ? ['source', 'medium', 'campaign', 'content', 'term'] : ['source', 'medium', 'campaign'];
  for (const key of keys) {
    const value = input[`utm_${key}`];
    if (typeof value === 'string' && CAMPAIGN.test(value.toLowerCase())) result[`utm_${key}`] = value.toLowerCase();
  }
  return result;
}

export function buildFreshEntryContext(currentUrl: string, referrer: string, surface: AnalyticsSurface = 'sitewide') {
  const url = new URL(currentUrl);
  return sanitizeEntryContext({
    landing_page: url.pathname,
    $referrer: referrer,
    ...Object.fromEntries(['source', 'medium', 'campaign', 'content', 'term'].map((key) => [`utm_${key}`, url.searchParams.get(`utm_${key}`)])),
  }, surface);
}

function safeDomain(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 253 || !/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/i.test(value)) return null;
  try {
    const url = new URL(`https://${value}`);
    return url.hostname === value.toLowerCase() ? url.hostname : null;
  } catch { return null; }
}

/** External paths are unnecessary here; retain host/origin, internal public path only. */
export function sanitizeAnalyticsLink(input: Record<string, unknown>, surface: AnalyticsSurface): AnalyticsProperties {
  const result: AnalyticsProperties = {};
  if (surface === 'sitewide' && input.link_kind === 'contact') return { link_kind: 'contact', conversion_stage: 'contact_intent' };
  let url: URL | null = null;
  if (typeof input.href === 'string' && input.href.length <= 4096) {
    try { url = new URL(input.href, ANALYTICS_ORIGIN); } catch { /* omit invalid href */ }
  }
  if (url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
    result.destination_host = url.hostname;
    result.link_kind = url.origin === ANALYTICS_ORIGIN ? 'internal' : 'external';
    if (url.origin === ANALYTICS_ORIGIN) {
      const path = publicAnalyticsPath(url.pathname);
      if (path) result.href = path;
    } else if (surface === 'mff_manifesto' || url.origin === 'https://work.thearcades.me') result.href = url.origin;
  } else if (!url && (input.link_kind === 'internal' || input.link_kind === 'external')) {
    const host = safeDomain(input.destination_host);
    if (host) {
      result.destination_host = host;
      result.link_kind = host === new URL(ANALYTICS_ORIGIN).hostname ? 'internal' : 'external';
    }
  }
  if (!result.link_kind && surface === 'mff_manifesto') result.link_kind = 'other';
  if (surface === 'sitewide' && result.destination_host === 'work.thearcades.me' && ['resume', 'resume_pdf'].includes(String(input.destination_kind))) {
    result.destination_kind = String(input.destination_kind);
    result.conversion_stage = input.destination_kind === 'resume_pdf' ? 'resume_download_intent' : 'resume_navigation_intent';
  }
  return result;
}

function readerDestination(value: unknown): string | null {
  if (value === 'none') return value;
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value, ANALYTICS_ORIGIN);
    if (url.username || url.password) return null;
    if (url.origin === ANALYTICS_ORIGIN) return publicAnalyticsPath(url.pathname);
    const publicUrl = `${url.origin}${url.pathname}`;
    if (POST_CANONICAL_EDITIONS.some(({ canonicalUrl }) => canonicalUrl === publicUrl)) return publicUrl;
    // These two fixed public reading links already exist in SubscriptionForm.
    if (['https://work.thearcades.me', 'https://hack.thearcades.me'].includes(url.origin) && url.pathname === '/blog') return `${url.origin}/blog`;
  } catch { /* omit invalid destination */ }
  return null;
}

/** Shared by Vercel reader calls and PostHog; never spread supplied properties. */
export function sanitizeReaderProperties(value: unknown): AnalyticsProperties | null {
  const input = analyticsRecord(value);
  if (!input) return null;
  const canonicalId = readerDestination(input.canonicalId);
  const destination = readerDestination(input.destination);
  if (!canonicalId || !publicAnalyticsPath(canonicalId) || !destination || typeof input.contentType !== 'string' || !READER_TYPES.has(input.contentType) || typeof input.placement !== 'string' || !READER_PLACEMENTS.has(input.placement)) return null;
  return { canonicalId, contentType: input.contentType, placement: input.placement, destination };
}

export function sanitizeAnalyticsPayload(value: unknown, surface: AnalyticsSurface) {
  const payload = analyticsRecord(value);
  if (!payload || typeof payload.event !== 'string' || !(surface === 'sitewide' ? SITE_EVENTS : MFF_EVENTS).has(payload.event) || !isAnalyticsId(payload.distinct_id)) return null;
  const input = analyticsRecord(payload.properties);
  if (!input || typeof input.$current_url !== 'string' || input.$current_url.length > 4096) return null;
  const current = safeOrigin(input.$current_url);
  if (!current) return null;
  const context = buildSiteAnalyticsContext(current.pathname, current.href);
  if (!context || (surface === 'mff_manifesto' && context.pathname !== '/mff')) return null;
  // Supplied context may not contradict the validated production URL.
  if (input.pathname !== undefined && publicAnalyticsPath(input.pathname) !== context.pathname) return null;
  if (input.$pathname !== undefined && publicAnalyticsPath(input.$pathname) !== context.pathname) return null;
  for (const key of ['hostname', '$host']) if (input[key] !== undefined && input[key] !== context.$host) return null;
  const properties: AnalyticsProperties = { ...sanitizeEntryContext(input, surface), ...context, hostname: context.$host, analytics_surface: surface };
  if (surface === 'sitewide') {
    // Preserve legacy receipts during rollout without changing visitor IDs.
    for (const key of ['$session_id', '$window_id']) if (isAnalyticsId(input[key]) || isAnalyticsSessionId(input[key])) properties[key] = input[key];
    properties.session_model = isAnalyticsSessionId(input.$session_id) ? 'tab_uuidv7_v2' : 'legacy_v1';
    if (payload.event === 'site link clicked') Object.assign(properties, sanitizeAnalyticsLink(input, surface));
    else if (payload.event !== '$pageview') {
      const reader = sanitizeReaderProperties(input);
      if (!reader) return null;
      Object.assign(properties, reader);
      if (payload.event === 'reading-engagement') {
        const metrics = sanitizeEngagement(input);
        if (!metrics || reader.canonicalId !== context.pathname) return null;
        Object.assign(properties, metrics);
      }
      if (payload.event.startsWith('signup ')) properties.conversion_stage = payload.event === 'signup confirmation requested'
        ? 'verification_request_accepted' : payload.event === 'signup request submitted' ? 'request_intent' : 'request_failed';
    }
  } else {
    const addLabel = (key: keyof typeof mffLabels) => {
      const value = input[key];
      if (typeof value === 'string' && mffLabels[key].includes(value)) properties[key] = value;
    };
    switch (payload.event) {
      case 'mff scroll reached':
        if (typeof input.percent !== 'number' || ![25, 50, 75, 90, 100].includes(input.percent)) return null;
        properties.percent = input.percent;
        break;
      case 'mff section viewed': case 'mff sources opened': addLabel('section'); break;
      case 'mff exhibit viewed': addLabel('heading'); addLabel('exhibit'); break;
      case 'mff link clicked': Object.assign(properties, sanitizeAnalyticsLink(input, surface)); addLabel('label'); addLabel('section'); break;
    }
  }
  return { event: payload.event, distinct_id: payload.distinct_id, properties };
}
