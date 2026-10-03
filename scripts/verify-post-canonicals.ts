/**
 * Read-only release check: npm exec tsx scripts/verify-post-canonicals.ts <creative-origin>
 * Use a running local build or authorized candidate deployment, then production
 * after release. This never submits forms, changes indexing, or follows redirects.
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { WORK_SITE_URL } from '../lib/post-canonical';
import { CREATIVE_ORIGINALS_WITH_WORK_COPIES as ORIGINALS } from '../lib/post-canonical-originals.fixture';
import { SITE_URL } from '../lib/site-url';

const candidate = new URL(process.argv[2] ?? 'http://localhost:3000');
assert.ok(candidate.protocol === 'https:' || (candidate.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(candidate.hostname)), 'Use HTTPS or a local test server');
assert.ok(!candidate.username && !candidate.password && !candidate.search && !candidate.hash && candidate.pathname === '/', 'Provide only the creative deployment origin');

const requireCandidateIndexable = candidate.origin === SITE_URL;
console.log(requireCandidateIndexable
  ? 'Mode: production creative acceptance; indexing restrictions are failures.'
  : 'Mode: candidate metadata verification; preview/local noindex is reported and allowed. This is not production indexing acceptance.');

function checkIndexability(value: string, url: string, source: string, required: boolean) {
  if (required) assert.doesNotMatch(value, /noindex|none/i, `${url}: ${source} blocks indexing`);
  else if (/noindex|none/i.test(value)) console.log(`NOTE ${url}: candidate ${source} is ${value}; preserved for preview safety`);
}

async function get(url: string, expectedType: string, requireIndexable = true): Promise<string> {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `${url}: direct HTTP 200 required`);
  assert.ok(response.headers.get('content-type')?.includes(expectedType), `${url}: expected ${expectedType}`);
  checkIndexability(response.headers.get('x-robots-tag') ?? '', url, 'X-Robots-Tag', requireIndexable);
  return response.text();
}

async function verifyArticle(url: string, canonicalUrl: string, type = 'BlogPosting', requireIndexable = true) {
  const document = new JSDOM(await get(url, 'text/html', requireIndexable)).window.document;
  assert.ok(document.querySelector('h1')?.textContent?.trim(), `${url}: missing article heading`);
  assert.deepEqual([...document.querySelectorAll('link[rel="canonical"]')].map((element) => element.getAttribute('href')), [canonicalUrl], `${url}: canonical mismatch`);
  assert.deepEqual([...document.querySelectorAll('meta[property="og:url"]')].map((element) => element.getAttribute('content')), [canonicalUrl], `${url}: og:url mismatch`);
  for (const meta of document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')) {
    checkIndexability(meta.getAttribute('content') ?? '', url, 'robots meta', requireIndexable);
  }
  const documents = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((element) => JSON.parse(element.textContent ?? '{}') as Record<string, unknown>);
  const article = documents.find((entry) => entry['@type'] === type);
  assert.ok(article, `${url}: missing ${type} schema`);
  assert.equal(article.url, canonicalUrl, `${url}: schema URL mismatch`);
  const mainEntity = article.mainEntityOfPage;
  assert.equal(typeof mainEntity === 'string' ? mainEntity : (mainEntity as Record<string, unknown>)?.['@id'], canonicalUrl, `${url}: mainEntityOfPage mismatch`);
  console.log(`PASS ${url} -> ${canonicalUrl}`);
}

// Map v2: creative originals are canonical; work copies point at them.
// The original must be ready (self-canonical, indexable) before work copies point at it.
for (const { creativePath } of ORIGINALS) {
  const original = `${SITE_URL}${creativePath}`;
  await verifyArticle(`${candidate.origin}${creativePath}`, original, 'BlogPosting', requireCandidateIndexable);
  await verifyArticle(`${candidate.origin}${creativePath}?utm_source=canonical-check&canonical=https%3A%2F%2Fevil.example`, original, 'BlogPosting', requireCandidateIndexable);
}
const controlPath = '/projects/the-singularity-log/rabies-capitalism';
await verifyArticle(`${candidate.origin}${controlPath}`, `${SITE_URL}${controlPath}`, 'BlogPosting', requireCandidateIndexable);

const creativeSitemap = new JSDOM(await get(`${candidate.origin}/sitemap.xml`, 'xml', requireCandidateIndexable), { contentType: 'text/xml' }).window.document;
const creativeUrls = new Set([...creativeSitemap.querySelectorAll('loc')].map((element) => element.textContent));
const llms = await get(`${candidate.origin}/llms.txt`, 'text/plain', requireCandidateIndexable);
const feed = new JSDOM(await get(`${candidate.origin}/feed.xml`, 'xml', requireCandidateIndexable), { contentType: 'text/xml' }).window.document;
for (const { creativePath, workCopyUrl } of ORIGINALS) {
  assert.ok(creativeUrls.has(`${SITE_URL}${creativePath}`), `${creativePath}: missing from creative sitemap`);
  assert.ok(!creativeUrls.has(workCopyUrl), `${workCopyUrl}: foreign entry in creative sitemap`);
  assert.ok(llms.includes(`](${SITE_URL}${creativePath})`) && !llms.includes(`](${workCopyUrl})`), `${creativePath}: llms mismatch`);
  const item = [...feed.querySelectorAll('item')].find((entry) => entry.querySelector('guid')?.textContent === `${SITE_URL}${creativePath}`);
  assert.ok(item, `${creativePath}: RSS GUID changed`);
  assert.equal(item.querySelector('link')?.textContent, `${SITE_URL}${creativePath}`, `${creativePath}: RSS link mismatch`);
}
assert.ok(creativeUrls.has(`${SITE_URL}${controlPath}`), 'Distinct control disappeared from sitemap');

// Work copies: point at the original and stay out of the work sitemap. Their
// canonical cross-domain target is what makes them non-preferred, so they are
// expected to remain indexable pages (no noindex).
await verifyArticle(`${WORK_SITE_URL}/work/bunch`, `${WORK_SITE_URL}/work/bunch`, 'Article');
const workSitemap = new JSDOM(await get(`${WORK_SITE_URL}/sitemap.xml`, 'xml'), { contentType: 'text/xml' }).window.document;
const workUrls = new Set([...workSitemap.querySelectorAll('loc')].map((element) => element.textContent));
for (const { creativePath, workCopyUrl } of ORIGINALS) {
  await verifyArticle(workCopyUrl, `${SITE_URL}${creativePath}`);
  assert.ok(!workUrls.has(workCopyUrl), `${workCopyUrl}: copy still in work sitemap`);
}
console.log('PASS originals, work copies, sitemaps, llms and stable RSS identities. Check robots.txt and retained PDF/legacy routes before release.');
