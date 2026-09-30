import assert from 'node:assert/strict';
import test from 'node:test';
import { POST_CANONICAL_EDITIONS } from './post-canonical';
import { sanitizeAnalyticsPayload, sanitizeEntryContext, sanitizeReaderProperties } from './analytics-payload';

const id = '9e833036-9f38-44d9-9d26-3d9c1b332f94';
const site = 'https://www.thearcades.me';
const payload = (event = '$pageview', properties: Record<string, unknown> = {}) => ({ event, distinct_id: id, properties: { $current_url: `${site}/stories?email=secret#token`, ...properties } });
const reader = { canonicalId: '/novels/it-takes-a-zoo/cold-boot', contentType: 'chapter', placement: 'reader-body', destination: 'none' };

test('event allowlist and UUID shape reject arbitrary or malformed submissions', () => {
  for (const value of [null, [], 'secret', 42, {}, payload('unknown'), { ...payload(), distinct_id: 'private@example.com' }, { ...payload(), properties: [] }]) assert.equal(sanitizeAnalyticsPayload(value, 'sitewide'), null);
});

test('shared context strips arbitrary properties, person updates, full URLs and unsafe entry data', () => {
  const result = sanitizeAnalyticsPayload(payload('$pageview', {
    email: 'private@example.com', $set: { email: 'private@example.com' }, $identify: true, $raw_user_agent: 'forged',
    landing_page: '/subscribe/verify', $referrer: 'https://example.com/private?email=secret#token', referring_domain: 'forged',
    utm_source: 'THEARCADES', utm_campaign: 'professional_handoff', utm_content: 'home_header', utm_term: 'email@example.com',
    $session_id: id, $window_id: id,
  }), 'sitewide');
  assert.ok(result);
  assert.deepEqual(result.properties, {
    $referrer: 'https://example.com', referring_domain: 'example.com', utm_source: 'thearcades', utm_campaign: 'professional_handoff', utm_content: 'home_header',
    pathname: '/stories', $pathname: '/stories', $host: 'www.thearcades.me', $current_url: `${site}/stories`, hostname: 'www.thearcades.me', analytics_surface: 'sitewide', $session_id: id, $window_id: id,
  });
  for (const content of ['home_header', 'home_entry', 'start_entry']) assert.equal(sanitizeEntryContext({ utm_campaign: 'professional_handoff', utm_content: content }).utm_content, content);
  for (const value of [null, [], 'secret', { landing_page: '/unknown', $session_id: 'forged', utm_source: 'a'.repeat(65), $referrer: 'javascript:secret' }]) assert.deepEqual(sanitizeEntryContext(value), {});
});

test('claimed context cannot override production origin/public page validation', () => {
  for (const properties of [{ $current_url: 'https://preview.vercel.app/stories' }, { $current_url: `${site}/subscribe/verify#token` }, { $current_url: `${site}/unknown` }, { $current_url: `https://user:pass@www.thearcades.me/stories` }, { hostname: 'preview.vercel.app' }, { $host: 'evil.test' }, { pathname: '/mff' }, { $pathname: '/subscribe/unsubscribe' }]) assert.equal(sanitizeAnalyticsPayload(payload('$pageview', properties), 'sitewide'), null);
});

test('all reader events preserve canonical identity, trigger names and safe destination', () => {
  for (const event of ['reading-start', 'end-reached', 'onward-reading', 'resume-click', 'signup confirmation requested']) {
    const result = sanitizeAnalyticsPayload(payload(event, { ...reader, destination: '/stories?email=secret#token' }), 'sitewide');
    assert.ok(result); assert.equal(result.event, event); assert.equal(result.properties.canonicalId, reader.canonicalId); assert.equal(result.properties.destination, '/stories');
  }
  assert.equal(sanitizeReaderProperties({ ...reader, canonicalId: '/unknown' }), null);
  assert.equal(sanitizeReaderProperties({ ...reader, destination: 'mailto:private@example.com' }), null);
  assert.equal(sanitizeReaderProperties({ ...reader, placement: 'private@example.com' }), null);
  assert.deepEqual(sanitizeReaderProperties({ ...reader, destination: 'https://work.thearcades.me/blog?secret#token', unexpected: 'private' }), { ...reader, destination: 'https://work.thearcades.me/blog' });
});

test('link counts retain safe path/host context while query/hash and non-HTTP values never survive', () => {
  for (const [href, expected] of [['/stories?secret#token', '/stories'], ['https://work.thearcades.me/blog/private?secret#token', 'https://work.thearcades.me']]) assert.equal(sanitizeAnalyticsPayload(payload('site link clicked', { href }), 'sitewide')?.properties.href, expected);
  for (const href of ['mailto:private@example.com', 'javascript:secret', '/subscribe/verify#token', '/unknown?secret', 'https://example.com/private?secret']) assert.equal(sanitizeAnalyticsPayload(payload('site link clicked', { href }), 'sitewide')?.properties.href, undefined);
});

test('MFF events preserve numeric milestones and exact public labels with separate property allowlists', () => {
  const mff = (event: string, properties: Record<string, unknown> = {}) => sanitizeAnalyticsPayload(payload(event, { $current_url: `${site}/mff?secret#token`, ...properties }), 'mff_manifesto');
  for (const percent of [25, 50, 75, 90, 100]) assert.equal(mff('mff scroll reached', { percent })?.properties.percent, percent);
  for (const percent of ['25', 0, 101, NaN]) assert.equal(mff('mff scroll reached', { percent }), null);
  assert.equal(mff('mff section viewed', { section: 'Why this matters to me' })?.properties.section, 'Why this matters to me');
  assert.equal(mff('mff section viewed', { section: 'private@example.com' })?.properties.section, undefined);
  assert.equal(mff('mff exhibit viewed', { heading: 'It Takes a Zoo', exhibit: 'Exhibit 06 · Fiction' })?.properties.exhibit, 'Exhibit 06 · Fiction');
  assert.equal(mff('mff sources opened', { section: 'Sources & further reading' })?.properties.section, 'Sources & further reading');
  const link = mff('mff link clicked', { href: 'https://example.com/private?secret#token', label: 'Start here', section: 'Name the harm', percent: 50, $session_id: id });
  assert.equal(link?.properties.href, 'https://example.com'); assert.equal(link?.properties.percent, undefined); assert.equal(link?.properties.$session_id, undefined);
  assert.equal(mff('mff link clicked', { href: 'mailto:private@example.com', label: 'Email me' })?.properties.link_kind, 'other');
  assert.equal(sanitizeAnalyticsPayload(payload('mff page viewed'), 'mff_manifesto'), null);
  assert.equal(mff('reading-start', reader), null);
});


test('reader completion and merged-main canonical recommendation destinations remain measurable', () => {
  assert.ok(sanitizeAnalyticsPayload(payload('end-reached', { ...reader, placement: 'reader-end' }), 'sitewide'));
  for (const { canonicalUrl, creativePath } of POST_CANONICAL_EDITIONS) {
    const props = sanitizeReaderProperties({ ...reader, canonicalId: creativePath, placement: 'recommended-reading', destination: `${canonicalUrl}?secret#token` });
    assert.ok(props); assert.equal(props.destination, canonicalUrl); assert.equal(props.canonicalId, creativePath);
  }
});
