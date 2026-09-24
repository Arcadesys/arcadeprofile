import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { ORIENTATION_NAV_ITEMS } from './nav-items';
import {
  RESUME_ACCOMPLISHMENTS,
  RESUME_EXPERIENCE,
  buildResumeEditorialPiece,
} from './resume';
import { buildStaticSitemapEntries } from './sitemap';

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

test('the homepage opens the professional lane immediately after the hero', () => {
  const home = source('app/(frontend)/page.tsx');
  const hero = home.indexOf('</header>');
  const workLane = home.indexOf('className={styles.workLane}');
  const resume = home.indexOf('className={styles.resume}');
  const bands = home.indexOf('className={styles.bands}');

  assert.ok(workLane !== -1, 'homepage is missing the professional work lane');
  assert.ok(hero !== -1 && workLane > hero, 'the work lane must follow the homepage hero');
  assert.ok(resume > workLane, 'the professional lane must precede reading-resume controls');
  assert.ok(bands > workLane, 'the work lane must precede the fiction and essay bands');
  assert.match(home, /href="\/resume">Read the resume/);
  assert.match(home, /href="\/resume\/pdf">Download PDF/);
});

test('the reader funnel keeps its homepage entry points', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<Link className=\{styles\.button\} href="\/start">Start Here/);
  assert.match(home, /<Link className=\{styles\.latestLink\} href="\/latest">Latest/);
  assert.match(home, /href="\/stories">Read fiction/);
  assert.match(home, /href="\/essays">Read essays/);
});

test('the resume sits in the primary navigation rail and the footer', () => {
  assert.ok(
    ORIENTATION_NAV_ITEMS.some((item) => item.href === '/resume'),
    'the resume must be a primary orientation destination',
  );

  const navbar = source('app/components/NavbarClient.tsx');
  assert.match(navbar, /case '\/resume':/, 'the resume needs a nav rail icon');

  const footer = source('app/components/Footer.tsx');
  assert.match(footer, /href="\/resume"/);
});

test('the resume page renders from shared data and offers the PDF edition', () => {
  const page = source('app/(frontend)/resume/page.tsx');

  assert.match(page, /from '@\/lib\/resume'/);
  assert.match(page, /<PieceActions/);
  assert.match(page, /pdfHref=\{RESUME_PDF_PATH\}/);
  assert.doesNotMatch(page, /style=\{\{/, 'the resume page must use its CSS module, not inline styles');
});

test('the resume PDF piece carries the whole web edition', () => {
  const piece = buildResumeEditorialPiece();

  assert.equal(piece.canonicalPath, '/resume');
  assert.equal(piece.pdfPath, '/resume/pdf');
  assert.equal(piece.section, 'Resume');
  assert.ok(piece.blocks.length > 0);

  const flattened = piece.blocks
    .map((block) => (block.type === 'list' ? block.items.join(' ') : block.text))
    .join('\n');

  for (const role of RESUME_EXPERIENCE) {
    assert.ok(flattened.includes(role.company), `PDF blocks are missing ${role.company}`);
    for (const bullet of role.bullets) {
      assert.ok(flattened.includes(bullet), `PDF blocks are missing a ${role.company} bullet`);
    }
  }

  assert.ok(flattened.includes('austen.crowder@gmail.com'), 'the PDF must carry contact details');
});

test('the PDF header does not repeat the name as a byline', () => {
  const piece = buildResumeEditorialPiece();
  const renderer = source('lib/editorial-pdf.tsx');

  assert.equal(piece.author, piece.title, 'the resume is titled after its author');
  assert.match(renderer, /piece\.author === piece\.title/);
});

test('resume accomplishments only cite proof that exists on the site', () => {
  for (const item of RESUME_ACCOMPLISHMENTS) {
    if (!item.proofHref) continue;
    assert.ok(
      PROOF_ROUTES.has(item.proofHref),
      `${item.proofHref} is not a known on-site artifact`,
    );
  }
});

test('the sitemap ranks the resume alongside the other landing surfaces', () => {
  const entry = buildStaticSitemapEntries('https://www.thearcades.me')
    .find((candidate) => candidate.url.endsWith('/resume'));

  assert.ok(entry, 'the sitemap is missing the resume');
  assert.ok((entry.priority ?? 0) >= 0.9, 'the resume should rank with the other landing pages');
});
