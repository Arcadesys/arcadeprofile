import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ORIENTATION_NAV_ITEMS } from './nav-items';
import { buildStaticSitemapEntries } from './sitemap';
import { WORK_RESUME_PDF_URL, WORK_RESUME_URL } from './work-resume';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the homepage keeps one small work link in its brand bar', () => {
  const home = source('app/(frontend)/page.tsx');
  assert.equal((home.match(/Work with me/g) ?? []).length, 1);
  assert.match(home, /href="https:\/\/work\.thearcades\.me\/\?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_header">\s*Work with me/);
  assert.equal(WORK_RESUME_URL, 'https://work.thearcades.me/resume');
  assert.equal(WORK_RESUME_PDF_URL, 'https://work.thearcades.me/resume.pdf');
});

test('the reader funnel keeps its homepage entry points', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /href="\/stories">All stories/);
  assert.match(home, /href="\/essays">All essays/);
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
