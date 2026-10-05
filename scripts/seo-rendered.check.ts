/**
 * Rendered-HTML SEO contract (#294). Runs against a running build, never the
 * live site: `npm run build && npm start`, then
 * `SEO_BASE_URL=http://localhost:3000 npm run test:seo`. CI does the same.
 * Expected URLs are the production origin because metadata always names it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { SITE_URL } from '../lib/site-url';

const BASE = (process.env.SEO_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function get(path: string, redirect: RequestRedirect = 'manual') {
  const response = await fetch(`${BASE}${path}`, { redirect, signal: AbortSignal.timeout(30_000) });
  return { status: response.status, headers: response.headers, body: await response.text() };
}

const all = (source: string, pattern: RegExp) => [...source.matchAll(pattern)].map((match) => match[1]);
const canonicals = (html: string) => all(html, /<link rel="canonical" href="([^"]*)"/g);
const ogUrls = (html: string) => all(html, /<meta property="og:url" content="([^"]*)"/g);
const ogImages = (html: string) => all(html, /<meta property="og:image" content="([^"]*)"/g);
const titles = (html: string) => all(html, /<title>([^<]*)<\/title>/g);
const descriptions = (html: string) => all(html, /<meta name="description" content="([^"]*)"/g);
const robotsMeta = (html: string) => all(html, /<meta name="robots" content="([^"]*)"/g);
function jsonLd(html: string): Array<Record<string, unknown>> {
  return all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map((raw) => JSON.parse(raw));
}

// Representative public routes and their own canonical. The three originals
// also have work copies that point here (map v2, docs/seo/canonical-policy.md).
const PAGES: Array<{ path: string; schema?: string }> = [
  { path: '/' },
  { path: '/stories' },
  { path: '/essays' },
  { path: '/novels/it-takes-a-zoo', schema: 'CollectionPage' },
  { path: '/novels/it-takes-a-zoo/cold-boot', schema: 'Chapter' },
  { path: '/projects/the-singularity-log/rabies-capitalism', schema: 'BlogPosting' },
  { path: '/projects/bunch/bunch', schema: 'BlogPosting' },
  { path: '/projects/arcade-blog/four-stages-nobody-tells-you-about', schema: 'BlogPosting' },
  { path: '/projects/the-singularity-log/claude-design-and-the-novel-t', schema: 'BlogPosting' },
];
const expectedUrl = (path: string) => (path === '/' ? SITE_URL : `${SITE_URL}${path}`);

test('public pages emit one self-canonical, matching og:url, a title, a description and an absolute image', async () => {
  const seenTitles = new Map<string, string>();
  for (const { path } of PAGES) {
    const { status, body } = await get(path);
    assert.equal(status, 200, `${path} status`);
    assert.deepEqual(canonicals(body), [expectedUrl(path)], `${path} canonical`);
    assert.deepEqual(ogUrls(body), [expectedUrl(path)], `${path} og:url`);
    const [title] = titles(body);
    assert.ok(title, `${path} title`);
    assert.ok(!seenTitles.has(title), `${path} repeats the title of ${seenTitles.get(title)}`);
    seenTitles.set(title, path);
    assert.equal(descriptions(body).length, 1, `${path} description`);
    assert.ok(robotsMeta(body).every((value) => !/noindex/i.test(value)), `${path} must stay indexable`);
    const images = ogImages(body);
    assert.ok(images.length >= 1, `${path} og:image`);
    for (const image of images) assert.match(image, /^https:\/\//, `${path} og:image must be absolute HTTPS`);
  }
});

test('query strings and spoofed canonical parameters do not change the canonical', async () => {
  for (const path of ['/stories', '/projects/bunch/bunch']) {
    const { body } = await get(`${path}?utm_source=seo-test&canonical=https%3A%2F%2Fevil.example`);
    assert.deepEqual(canonicals(body), [expectedUrl(path)], path);
  }
});

test('structured data parses and article identity agrees with the canonical', async () => {
  for (const { path, schema } of PAGES) {
    const { body } = await get(path);
    const documents = jsonLd(body);
    assert.ok(documents.some((doc) => doc['@type'] === 'WebSite'), `${path} WebSite`);
    if (!schema) continue;
    const entity = documents.find((doc) => doc['@type'] === schema);
    assert.ok(entity, `${path} ${schema}`);
    if (schema === 'BlogPosting') {
      const main = entity.mainEntityOfPage;
      const id = typeof main === 'string' ? main : (main as Record<string, unknown> | undefined)?.['@id'];
      assert.equal(id, expectedUrl(path), `${path} mainEntityOfPage`);
      assert.ok(typeof entity.datePublished === 'string', `${path} datePublished`);
    }
  }
});

test('the default share card is served as an image', async () => {
  const { status, headers } = await get('/social-card');
  assert.equal(status, 200);
  assert.match(headers.get('content-type') ?? '', /^image\//);
});

test('sitemap lists only production-origin public URLs and keeps the intended exclusions', async () => {
  const { status, body } = await get('/sitemap.xml');
  assert.equal(status, 200);
  // The bare origin and its trailing-slash form are the same URL.
  const urls = all(body, /<loc>([^<]*)<\/loc>/g).map((url) => (url === `${SITE_URL}/` ? SITE_URL : url));
  assert.ok(urls.length > 20, 'expected a full sitemap');
  for (const url of urls) assert.ok(url === SITE_URL || url.startsWith(`${SITE_URL}/`), `${url} has the wrong origin`);
  for (const { path } of PAGES) assert.ok(urls.includes(expectedUrl(path)), `${path} missing from sitemap`);
  assert.ok(!urls.some((url) => url.endsWith('/resume')), 'the résumé moved to work.thearcades.me');
  assert.ok(!urls.some((url) => /\/(preview|admin|api|drafts)\b/.test(url)), 'private routes leaked into the sitemap');
});

test('robots.txt keeps its exclusions and points at the sitemap', async () => {
  const { status, body } = await get('/robots.txt');
  assert.equal(status, 200);
  for (const rule of ['Disallow: /preview/', 'Disallow: /admin/', 'Disallow: /api/']) assert.ok(body.includes(rule), rule);
  assert.ok(body.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
});

test('retired résumé routes redirect permanently and missing pages 404', async () => {
  const resume = await get('/resume');
  assert.equal(resume.status, 308);
  assert.equal(resume.headers.get('location'), 'https://work.thearcades.me/resume');
  const pdf = await get('/resume/pdf');
  assert.equal(pdf.status, 308);
  assert.equal(pdf.headers.get('location'), 'https://work.thearcades.me/resume.pdf');
  assert.equal((await get('/definitely-not-a-real-page-seo-test')).status, 404);
});
