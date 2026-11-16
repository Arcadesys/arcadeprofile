import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ORIENTATION_NAV_ITEMS } from './nav-items';
import { buildStaticSitemapEntries } from './sitemap';
import { WORK_RESUME_PDF_URL, WORK_RESUME_URL } from './work-resume';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage keeps one door to the work site and no résumé links', () => {
  const home = source('app/(frontend)/page.tsx');
  const hero = home.indexOf('</header>');
  const paths = home.indexOf('className={styles.entryPaths}');
  const latest = home.indexOf('className={styles.recent}');

  assert.ok(hero !== -1 && paths > hero, 'the entry paths must follow the homepage hero');
  assert.ok(latest > paths, 'the entry paths must precede the latest writing');
  const lane = home.slice(paths, latest);
  assert.match(lane, /href="https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_entry">\s*Visit the work site/);
  assert.doesNotMatch(home, /WORK_RESUME|Read the resume|Download PDF/);
  assert.equal(WORK_RESUME_URL, 'https://work.thearcades.me/resume');
  assert.equal(WORK_RESUME_PDF_URL, 'https://work.thearcades.me/resume.pdf');
});

test('the reader funnel keeps its homepage entry points', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<Link className=\{styles\.button\} href="\/start">Start Here/);
  assert.match(home, /<Link className=\{styles\.latestLink\} href="\/latest">Blog/);
  assert.match(home, /href="\/stories">All fiction/);
  assert.match(home, /href="\/essays">All essays/);
});

test('the résumé is off the writing site; the footer keeps one door to the builder site', () => {
  assert.ok(
    !ORIENTATION_NAV_ITEMS.some((item) => item.href === '/resume' || item.href === WORK_RESUME_URL),
    'the top bar stays reserved for reading destinations',
  );

  const footer = source('app/components/Footer.tsx');
  assert.doesNotMatch(footer, /WORK_RESUME_URL/);
  assert.match(footer, /BUILDER_SITE_NAV_ITEM\.href/);
  assert.doesNotMatch(source('app/(frontend)/bio/page.tsx'), /WORK_RESUME_URL|View résumé/);
  assert.doesNotMatch(source('lib/search.ts'), /WORK_RESUME_URL/);
});

test('the résumé cutover redirects permanently and leaves this sitemap (#287)', () => {
  assert.ok(!buildStaticSitemapEntries('https://www.thearcades.me').some((entry) => entry.url.endsWith('/resume')));
  const config = source('next.config.mjs');
  assert.match(config, /source: '\/resume',\s*destination: 'https:\/\/work\.thearcades\.me\/resume',\s*permanent: true/);
  assert.match(config, /source: '\/resume\/pdf',\s*destination: 'https:\/\/work\.thearcades\.me\/resume\.pdf',\s*permanent: true/);
});
