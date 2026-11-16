import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ORIENTATION_NAV_ITEMS } from './nav-items';
import { buildStaticSitemapEntries } from './sitemap';
import { WORK_RESUME_PDF_URL, WORK_RESUME_URL } from './work-resume';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/** Every route the resume is allowed to cite as on-site proof. */
const PROOF_ROUTES = new Set([
  '/lab',
  '/lab/wizwor',
  '/lab/toontok',
  '/lab/arcadeprofile',
  '/lab/conductor',
  '/projects',
  '/portfolio',
]);

test('the homepage offers the professional lane alongside the first reading choices', () => {
  const home = source('app/(frontend)/page.tsx');
  const hero = home.indexOf('</header>');
  const paths = home.indexOf('className={styles.entryPaths}');
  const latest = home.indexOf('className={styles.recent}');

  assert.ok(hero !== -1 && paths > hero, 'the entry paths must follow the homepage hero');
  assert.ok(latest > paths, 'the entry paths must precede the latest writing');
  const lane = home.slice(paths, latest);
  assert.match(lane, /href="https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_entry">\s*Visit the work site/);
  assert.match(lane, /href=\{WORK_RESUME_URL\}>Read the resume/);
  assert.match(lane, /href=\{WORK_RESUME_PDF_URL\}>Download PDF/);
});

test('the reader funnel keeps its homepage entry points', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<Link className=\{styles\.button\} href="\/start">Start Here/);
  assert.match(home, /<Link className=\{styles\.latestLink\} href="\/latest">Latest/);
  assert.match(home, /href="\/stories">All fiction/);
  assert.match(home, /href="\/essays">All essays/);
});

test('the resume is reached from the homepage lane and the footer, not the top bar', () => {
  assert.ok(
    !ORIENTATION_NAV_ITEMS.some((item) => item.href === '/resume'),
    'the top bar stays reserved for reading destinations',
  );

  const footer = source('app/components/Footer.tsx');
  assert.match(footer, /href=\{WORK_RESUME_URL\}/);
});


test('the résumé cutover redirects permanently and leaves this sitemap (#287)', () => {
  assert.ok(!buildStaticSitemapEntries('https://www.thearcades.me').some((entry) => entry.url.endsWith('/resume')));
  const config = source('next.config.mjs');
  assert.match(config, /source: '\/resume',\s*destination: 'https:\/\/work\.thearcades\.me\/resume',\s*permanent: true/);
  assert.match(config, /source: '\/resume\/pdf',\s*destination: 'https:\/\/work\.thearcades\.me\/resume\.pdf',\s*permanent: true/);
});
