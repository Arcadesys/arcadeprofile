import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';


const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('projects is the landing door for builds, case studies, portfolio, and toys', () => {
  const projects = source('app/components/ProjectsIndex.tsx');

  assert.doesNotMatch(projects, /href: '#project-index'/);
  assert.match(projects, /Things I&rsquo;m building <em>in public<\/em>/);
  assert.match(projects, /href="\/projects\/the-singularity-log"/);
  assert.match(projects, /href="#project-index">Or browse everything below/);
  assert.match(projects, /href: '\/lab'/);
  assert.match(projects, /href: '\/portfolio'/);
  assert.match(projects, /href: '\/toys'/);
  assert.match(projects, /<Link key=\{section.image\} href=\{section.href\}>/);
  assert.match(projects, /className=\{styles\.writingNow\} id="project-index"/);
  assert.match(projects, /Writing now/);
  assert.match(projects, /writingNow\.chapterCount} chapters available now/);
  assert.match(projects, /writingNow\.availability/);
  assert.match(projects, /Read It Takes a Zoo/);
  assert.match(projects, /aria-label="Filter and sort projects"/);

  const page = source('app/(frontend)/projects/page.tsx');
  assert.match(page, /title: ZOO_FEATURED_COLLECTION\.title/);
  assert.match(page, /href: ZOO_FEATURED_COLLECTION\.path/);
  assert.match(page, /const cadence = !isZooCollection && bucket === 'active'/);
  assert.match(page, /entries\.filter\(\(entry\) => entry\.slug !== ZOO_HUB_SLUG\)/);
  assert.doesNotMatch(projects, /SubscriptionForm/);
});

test('site-owned signup surfaces use one first-party form implementation', () => {
  // FooterSubscribe is excluded: email signups are currently paused
  // site-wide and it's a no-op stub rather than a SubscriptionForm caller.
  const surfaces = [
    'app/(frontend)/bio/page.tsx',
    'app/(frontend)/latest/page.tsx',
  ];

  for (const path of surfaces) {
    const contents = source(path);
    assert.match(contents, /SubscriptionForm/);
    assert.doesNotMatch(contents, /ActiveCampaignForm/);
  }
});

test('writing is an accessible section door to fiction, essays, and the bookshelf', () => {
  const writing = source('app/(frontend)/writing/page.tsx');

  assert.match(writing, /title: 'Fiction', href: '\/stories'/);
  assert.match(writing, /title: 'Essays', href: '\/essays'/);
  assert.match(writing, /title: 'Bookshelf', href: '\/bookshelf'/);
});

test('homepage mounts the resume banner under the hero with the public reading catalog', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<ContinueReadingBanner availablePaths=\{readingCatalog\.map\(\(piece\) => piece\.canonicalPath\)\} \/>/);
  assert.match(home, /getReadingCatalog\(\)/);
  assert.ok(home.indexOf('</header>') < home.indexOf('<ContinueReadingBanner'));
  assert.match(source('app/components/ContinueReadingBanner.tsx'), /availablePaths = \[\]/);
});
