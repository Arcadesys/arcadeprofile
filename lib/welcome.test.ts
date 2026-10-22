import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildStaticSitemapEntries } from './sitemap';
import { SITE_URL } from './site-url';

const page = readFileSync('app/(frontend)/welcome/page.tsx', 'utf8');

test('the business-card destination is a real branded page with public next steps', () => {
  assert.match(page, /export default function WelcomePage/);
  assert.match(page, /<h1>Austen Tucker<\/h1>/);
  assert.match(page, /Builder · Leader · Writer/);
  for (const destination of ['https://work.thearcades.me/', '/books', '/writing', '/bio', 'mailto:austen.crowder@gmail.com']) {
    assert.ok(page.includes(destination), destination);
  }
  assert.match(page, /href=\{WORK_RESUME_URL\}/);
  assert.doesNotMatch(page, /redirect\(|<iframe|<video|autoPlay|target="_blank"/);
});

test('welcome has its own canonical, social preview, and sitemap entry', () => {
  assert.match(page, /canonical: '\/welcome'/);
  assert.match(page, /url: '\/welcome'/);
  assert.match(page, /title: 'Welcome · Austen Tucker'/);
  assert.match(page, /images: \[DEFAULT_SOCIAL_IMAGE\]/);
  assert.match(page, /images: \[DEFAULT_SOCIAL_IMAGE.url\]/);
  assert.ok(buildStaticSitemapEntries(SITE_URL).some((entry) => entry.url === `${SITE_URL}/welcome`));
});

test('welcome uses labeled sections and the existing responsive keyboard-accessible layout', () => {
  assert.match(page, /aria-labelledby="welcome-next-heading"/);
  assert.match(page, /id="welcome-next-heading"/);
  assert.match(page, /aria-labelledby="welcome-more-heading"/);
  assert.match(page, /id="welcome-more-heading"/);
  assert.match(page, /\.\.\/start\/start.module.css/);
  const css = readFileSync('app/(frontend)/start/start.module.css', 'utf8');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
});
