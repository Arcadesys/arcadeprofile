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
  assert.match(page, /href: WORK_RESUME_URL/);
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

test('welcome uses labeled sections and its own large, single-column, keyboard-accessible layout', () => {
  for (const id of ['welcome-contact-heading', 'welcome-next-heading']) {
    assert.match(page, new RegExp(`aria-labelledby="${id}"`));
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /\.\/welcome\.module\.css/);
  const css = readFileSync('app/(frontend)/welcome/welcome.module.css', 'utf8');
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline: 4px solid/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(css, /min-height: 4rem/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test('welcome lists email once, as a contact button, not again as a destination', () => {
  assert.equal(page.split('mailto:austen.crowder@gmail.com').length - 1, 1);
});

test('welcome leads its contact block with a prominent LinkedIn link', () => {
  assert.match(page, /const LINKEDIN_URL = 'https:\/\/www\.linkedin\.com\/in\/austen-tucker-0968a914'/);
  const contact = page.slice(page.indexOf('id="welcome-contact-heading"'), page.indexOf('mailto:austen.crowder@gmail.com'));
  assert.match(contact, /href=\{LINKEDIN_URL\} className=\{`\$\{styles\.button\} \$\{styles\.primary\}`\}/);
  assert.match(contact, /Connect on LinkedIn/);
});
