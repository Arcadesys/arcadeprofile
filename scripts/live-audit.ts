/**
 * Bounded, read-only release audit for both sites (#294). Run after a deploy:
 *
 *   npm exec tsx scripts/live-audit.ts
 *   CREATIVE_ORIGIN=http://localhost:3000 WORK_ORIGIN=http://localhost:3001 npm exec tsx scripts/live-audit.ts
 *
 * It sends only GET requests, follows no redirects, submits no forms and changes
 * nothing. Network or tool failures are reported separately from site defects,
 * and the exit code is non-zero only for defects. Host-redirect checks run only
 * against the production origins.
 */
const CREATIVE = (process.env.CREATIVE_ORIGIN ?? 'https://www.thearcades.me').replace(/\/$/, '');
const WORK = (process.env.WORK_ORIGIN ?? 'https://work.thearcades.me').replace(/\/$/, '');
const CREATIVE_CANONICAL = 'https://www.thearcades.me';
const WORK_CANONICAL = 'https://work.thearcades.me';
const PRODUCTION = CREATIVE === CREATIVE_CANONICAL && WORK === WORK_CANONICAL;

type Outcome = { check: string; status: 'pass' | 'defect' | 'network'; detail: string };
const outcomes: Outcome[] = [];

async function fetchOnce(url: string) {
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'arcades-live-audit/1' } });
}

async function check(name: string, url: string, assertFn: (response: Response, body: string) => string | null) {
  let response: Response;
  let body = '';
  try {
    response = await fetchOnce(url);
    const type = response.headers.get('content-type') ?? '';
    if (/text|xml|json/.test(type)) body = await response.text();
    else await response.arrayBuffer();
  } catch (error) {
    outcomes.push({ check: name, status: 'network', detail: `${url}: ${(error as Error).message}` });
    return;
  }
  const problem = assertFn(response, body);
  outcomes.push({ check: name, status: problem ? 'defect' : 'pass', detail: problem ? `${url}: ${problem}` : url });
}

const canonicalOf = (html: string) => [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
const ogImageOf = (html: string) => /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1];

function page(expectedCanonical: string) {
  return (response: Response, body: string) => {
    if (response.status !== 200) return `expected 200, got ${response.status}`;
    if (/<meta name="robots" content="[^"]*noindex/i.test(body)) return 'unexpected noindex';
    const canonicals = canonicalOf(body);
    if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) return `canonical ${JSON.stringify(canonicals)} ≠ ${expectedCanonical}`;
    if (!ogImageOf(body)?.startsWith('https://')) return 'missing absolute og:image';
    return null;
  };
}

function redirect(expectedLocation: string, expectedStatus = [301, 308]) {
  return (response: Response) => {
    if (!expectedStatus.includes(response.status)) return `expected ${expectedStatus.join('/')}, got ${response.status}`;
    const location = response.headers.get('location') ?? '';
    return location.split('?')[0] === expectedLocation ? null : `location ${location} ≠ ${expectedLocation}`;
  };
}

function asset(typePattern: RegExp) {
  return (response: Response) => {
    if (response.status !== 200) return `expected 200, got ${response.status}`;
    const type = response.headers.get('content-type') ?? '';
    return typePattern.test(type) ? null : `content-type ${type}`;
  };
}

const notFound = (response: Response) => (response.status === 404 ? null : `expected 404, got ${response.status}`);

async function main() {
  // Representative public pages and their canonicals (map v2: thearcades.me originals).
  const creativePages = ['/', '/stories', '/essays', '/novels/it-takes-a-zoo', '/novels/it-takes-a-zoo/cold-boot', '/projects/bunch/bunch'];
  for (const path of creativePages) {
    await check(`creative page ${path}`, `${CREATIVE}${path}`, page(path === '/' ? CREATIVE_CANONICAL : `${CREATIVE_CANONICAL}${path}`));
  }
  const workPages = ['/', '/work-with-me', '/layoff-triage', '/blog/when-in-crisis-make-tea', '/work/bunch', '/resume'];
  for (const path of workPages) {
    await check(`work page ${path}`, `${WORK}${path}`, page(path === '/' ? WORK_CANONICAL : `${WORK_CANONICAL}${path}`));
  }
  // A work copy points at its thearcades.me original.
  await check('work copy → original', `${WORK}/blog/bunch`, page(`${CREATIVE_CANONICAL}/projects/bunch/bunch`));

  // Résumé cutover (#287) and its downloads.
  await check('creative /resume redirect', `${CREATIVE}/resume`, redirect(`${WORK_CANONICAL}/resume`));
  await check('creative /resume/pdf redirect', `${CREATIVE}/resume/pdf`, redirect(`${WORK_CANONICAL}/resume.pdf`));
  await check('work résumé PDF', `${WORK}/resume.pdf`, asset(/^application\/pdf/));

  // Share images, sitemaps, robots, missing pages.
  await check('creative default share card', `${CREATIVE}/social-card`, asset(/^image\//));
  await check('work post share card', `${WORK}/blog/when-in-crisis-make-tea/opengraph-image/card`, asset(/^image\/png/));
  await check('creative sitemap', `${CREATIVE}/sitemap.xml`, asset(/xml/));
  await check('work sitemap', `${WORK}/sitemap.xml`, asset(/xml/));
  await check('creative robots', `${CREATIVE}/robots.txt`, asset(/^text\/plain/));
  await check('work robots', `${WORK}/robots.txt`, asset(/^text\/plain/));
  await check('creative 404', `${CREATIVE}/live-audit-missing-page`, notFound);
  await check('work 404', `${WORK}/live-audit-missing-page`, notFound);

  if (PRODUCTION) {
    // Host canonicalization. Vercel may answer 301/307/308; any permanent or
    // temporary redirect to the canonical host is reported with its status.
    await check('creative http → https', 'http://www.thearcades.me/', redirect(`${CREATIVE_CANONICAL}/`, [301, 307, 308]));
    await check('creative apex → www', 'https://thearcades.me/', redirect(`${CREATIVE_CANONICAL}/`, [301, 307, 308]));
    await check('work http → https', 'http://work.thearcades.me/', redirect(`${WORK_CANONICAL}/`, [301, 307, 308]));
  }

  const width = Math.max(...outcomes.map((o) => o.check.length));
  for (const o of outcomes) console.log(`${o.status.toUpperCase().padEnd(7)} ${o.check.padEnd(width)}  ${o.detail}`);
  const defects = outcomes.filter((o) => o.status === 'defect').length;
  const network = outcomes.filter((o) => o.status === 'network').length;
  console.log(`\n${outcomes.length} checks · ${defects} defect(s) · ${network} network/tool failure(s) · mode: ${PRODUCTION ? 'production' : 'custom origins'}`);
  process.exitCode = defects > 0 ? 1 : 0;
}

await main();

export {};
