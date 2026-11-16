import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ORIENTATION_NAV_ITEMS } from './nav-items';
import { buildStaticSitemapEntries } from './sitemap';
import { WORK_RESUME_PDF_URL, WORK_RESUME_URL } from './work-resume';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('the writing-site homepage carries no résumé or work link', () => {
  const home = source('app/(frontend)/page.tsx');
  assert.doesNotMatch(home, /Work with me|work\.thearcades\.me|WORK_RESUME/);
  assert.equal(WORK_RESUME_URL, 'https://work.thearcades.me/resume');
  assert.equal(WORK_RESUME_PDF_URL, 'https://work.thearcades.me/resume.pdf');
});

test('the reader funnel keeps its homepage entry points', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /href="\/stories"[^>]*>All stories/);
  assert.match(home, /href="\/essays"[^>]*>All essays/);
});

test('the résumé is off the writing site rail; the footer keeps one door to the builder site', () => {
  assert.ok(
    !ORIENTATION_NAV_ITEMS.some((item) => item.href === WORK_RESUME_URL || /^https?:/.test(item.href)),
    'the rail carries reading destinations only',
  );

  const navbar = source('app/components/NavbarClient.tsx');
  assert.doesNotMatch(navbar, /WORK_RESUME_URL/);

  const footer = source('app/components/Footer.tsx');
  assert.match(footer, /BUILDER_SITE_NAV_ITEM/);
  assert.doesNotMatch(source('app/(frontend)/bio/page.tsx'), /WORK_RESUME_URL|View résumé/);
  assert.doesNotMatch(source('lib/search.ts'), /WORK_RESUME_URL/);
});


test('the résumé cutover redirects permanently and leaves this sitemap (#287)', () => {
  assert.ok(!buildStaticSitemapEntries('https://www.thearcades.me').some((entry) => entry.url.endsWith('/resume')));
  const config = source('next.config.mjs');
  assert.match(config, /source: '\/resume',\s*destination: 'https:\/\/work\.thearcades\.me\/resume',\s*permanent: true/);
  assert.match(config, /source: '\/resume\/pdf',\s*destination: 'https:\/\/work\.thearcades\.me\/resume\.pdf',\s*permanent: true/);
});
