import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ORIENTATION_NAV_ITEMS } from './nav-items';
import { buildStaticSitemapEntries } from './sitemap';
import { WORK_RESUME_PDF_URL, WORK_RESUME_URL } from './work-resume';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage offers the professional lane right after the first reading choices', () => {
  const home = source('app/(frontend)/page.tsx');
  const hero = home.indexOf('</header>');
  const shelf = home.indexOf('<StartReadingShelf');
  const workLane = home.indexOf('className={styles.workLane}');
  const bands = home.indexOf('className={styles.bands}');

  assert.ok(workLane !== -1, 'homepage is missing the professional work lane');
  assert.ok(hero !== -1 && shelf > hero, 'the reading shelf must follow the homepage hero');
  assert.ok(workLane > shelf, 'the work lane must follow the first reading choices');
  assert.ok(bands > workLane, 'the work lane must precede the fiction and essay bands');
  assert.match(home, /href="https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_header">\s*Work with me/);
  assert.match(home, /href=\{WORK_RESUME_URL\}>Read the resume/);
  assert.match(home, /href=\{WORK_RESUME_PDF_URL\}>Download PDF/);
  assert.equal(WORK_RESUME_URL, 'https://work.thearcades.me/resume');
  assert.equal(WORK_RESUME_PDF_URL, 'https://work.thearcades.me/resume.pdf');
});

test('the reader funnel keeps its homepage entry points', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<Link className=\{styles\.button\} href="\/start">Start Here/);
  assert.match(home, /<Link className=\{styles\.latestLink\} href="\/latest">Latest/);
  assert.match(home, /href="\/stories">Read fiction/);
  assert.match(home, /href="\/essays">Read essays/);
});

test('the resume sits in the primary navigation rail and the footer, linking to the work site', () => {
  assert.ok(
    ORIENTATION_NAV_ITEMS.some((item) => item.href === WORK_RESUME_URL),
    'the resume must be a primary orientation destination',
  );

  const navbar = source('app/components/NavbarClient.tsx');
  assert.match(navbar, /case WORK_RESUME_URL:/, 'the resume needs a nav rail icon');

  const footer = source('app/components/Footer.tsx');
  assert.match(footer, /href=\{WORK_RESUME_URL\}/);
});


test('the résumé cutover redirects permanently and leaves this sitemap (#287)', () => {
  assert.ok(!buildStaticSitemapEntries('https://www.thearcades.me').some((entry) => entry.url.endsWith('/resume')));
  const config = source('next.config.mjs');
  assert.match(config, /source: '\/resume',\s*destination: 'https:\/\/work\.thearcades\.me\/resume',\s*permanent: true/);
  assert.match(config, /source: '\/resume\/pdf',\s*destination: 'https:\/\/work\.thearcades\.me\/resume\.pdf',\s*permanent: true/);
});
