import mffLabels from '@/data/analytics-mff-labels.json';
import readerPaths from '@/data/analytics-reader-paths.json';
import { ANALYTICS_ORIGIN, buildSiteAnalyticsContext, isPublicReaderPdfDestination, publicAnalyticsPath } from '@/lib/site-analytics';
import { VALID_SOURCES } from '@/lib/subscribe-types';
import { POST_CANONICAL_EDITIONS } from '@/lib/post-canonical';
import { isAnalyticsSessionId } from '@/lib/analytics-session';
import { sanitizeEngagement } from '@/lib/reading-engagement';

export type AnalyticsSurface = 'sitewide' | 'mff_manifesto';
export type AnalyticsProperties = Record<string, string | number | boolean>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMPAIGN = /^[a-z0-9_-]{1,64}$/;
const SITE_EVENTS = new Set(['$pageview', '$pageleave', 'site link clicked', 'reading-start', 'end-reached', 'onward-reading', 'resume-click', 'signup confirmation requested', 'signup request submitted', 'signup request failed', 'reading-engagement']);
const MFF_EVENTS = new Set(['$pageview', 'mff page viewed', 'mff scroll reached', 'mff section viewed', 'mff exhibit viewed', 'mff link clicked', 'mff sources opened']);
const READER_PATHS = new Set<string>(readerPaths);
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
    if (surface === 'sitewide') {
      result.referring_domain = referrer.hostname;
      result.$referring_domain = referrer.hostname;
    }
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
  const purchaseKind = input.destination_kind;
  const publicPurchaseUrl = typeof input.href === 'string' && /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}(?:[?#].*)?$/i.test(input.href);
  const minimizedPurchase = input.href === undefined && input.link_kind === 'external' && input.destination_host === 'www.amazon.com';
  if (surface === 'sitewide' && input.$pathname === '/' && result.destination_host === 'www.amazon.com' && input.placement === 'home_hero'
    && ['amazon_kindle', 'amazon_paperback'].includes(String(purchaseKind))
    && (publicPurchaseUrl || minimizedPurchase)) {
    result.destination_kind = String(purchaseKind);
    result.placement = 'home_hero';
  }
  // Reader PDF routes are deliberately outside pageview eligibility. Classify
  // only an internal /pdf link whose parent is an exact allowlisted public page;
  // never retain the route itself or claim that a file was saved.
  const publicPdfPath = typeof input.href === 'string' && result.link_kind === 'internal'
    ? (() => {
      try {
        const url = new URL(input.href, ANALYTICS_ORIGIN);
        return isPublicReaderPdfDestination(input.$pathname, url.pathname, ANALYTICS_ORIGIN, url.origin) ? input.$pathname : null;
      } catch { return null; }
    })()
    : null;
  // After minimization, the fixed kind/stage and exact reader source remain
  // sufficient for an idempotent second pass without retaining the PDF route.
  const minimizedPublicPdf = input.href === undefined && input.link_kind === 'internal'
    && result.destination_host === new URL(ANALYTICS_ORIGIN).hostname
    && input.destination_kind === 'public_pdf'
    && input.conversion_stage === 'public_pdf_download_intent'
    && typeof input.$pathname === 'string' && READER_PATHS.has(input.$pathname)
    && publicAnalyticsPath(input.$pathname) === input.$pathname;
  if (surface === 'sitewide' && result.link_kind === 'internal' && (publicPdfPath || minimizedPublicPdf)) {
    result.destination_kind = 'public_pdf';
    result.conversion_stage = 'public_pdf_download_intent';
  }
  // Placement is an allowlisted public control label, never DOM/link text.
  if (surface === 'sitewide' && input.$pathname === '/' && result.link_kind === 'internal'
    && typeof result.href === 'string' && ['home_sample', 'home_shelf', 'home_browse'].includes(String(input.placement))) {
    result.placement = String(input.placement);
    result.conversion_stage = 'reading_navigation_intent';
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
  // Old clients remain compatible. New receipts must supply the complete stable
  // dedupe tuple, with an exact ISO timestamp (never silently replaced on retry).
  let receipt: { uuid: string; timestamp: string } | undefined;
  if (payload.uuid !== undefined || payload.timestamp !== undefined) {
    if (!isAnalyticsId(payload.uuid) || typeof payload.timestamp !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.timestamp)) return null;
    const time = Date.parse(payload.timestamp);
    if (!Number.isFinite(time) || new Date(time).toISOString() !== payload.timestamp
      || Math.abs(Date.now() - time) > 5 * 60_000) return null;
    receipt = { uuid: payload.uuid, timestamp: payload.timestamp };
    properties.collection_version = 'bounded_receipts_v1';
  }
  if (surface === 'sitewide') {
    // Preserve legacy receipts during rollout without changing visitor IDs.
    for (const key of ['$session_id', '$window_id']) if (isAnalyticsId(input[key]) || isAnalyticsSessionId(input[key])) properties[key] = input[key];
    properties.session_model = isAnalyticsSessionId(input.$session_id) ? 'tab_uuidv7_v2' : 'legacy_v1';
    if (isAnalyticsId(input.$pageview_id)) properties.$pageview_id = input.$pageview_id;
    if (payload.event === 'site link clicked') Object.assign(properties, sanitizeAnalyticsLink({ ...input, $pathname: context.pathname }, surface));
    else if (payload.event === '$pageleave') {
      if (!isAnalyticsId(input.$pageview_id) || !isAnalyticsSessionId(input.$session_id)
        || !['navigation', 'unmount', 'pagehide'].includes(String(input.lifecycle_reason))
        || typeof input.$prev_pageview_duration !== 'number' || !Number.isFinite(input.$prev_pageview_duration)
        || input.$prev_pageview_duration < 0 || input.$prev_pageview_duration >= 1800
        || typeof input.visible_seconds !== 'number' || !Number.isInteger(input.visible_seconds)
        || input.visible_seconds < 0 || input.visible_seconds > input.$prev_pageview_duration) return null;
      Object.assign(properties, { $prev_pageview_id: input.$pageview_id, $prev_pageview_pathname: context.pathname,
        $prev_pageview_duration: input.$prev_pageview_duration, visible_seconds: input.visible_seconds,
        lifecycle_reason: input.lifecycle_reason as string });
    } else if (payload.event !== '$pageview') {
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
  return { event: payload.event, distinct_id: payload.distinct_id, properties, ...receipt };
}
