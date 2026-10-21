import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('homepage sells the featured book before signup and reading discovery', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<p className=\{styles\.tagline\}>Everything here used to be something else\.<\/p>/);
  assert.match(home, /getBook\('this-is-what-i-do-for-fun'\)/);
  assert.match(home, /headingAs="h1"[\s\S]*placement="home_hero"/);
  assert.match(home, /pitch="Strange lives, remade\."/);
  assert.match(home, /<SubscriptionForm[\s\S]*audiences=\{\['all'\]\}[\s\S]*magnet="subscriber-exclusive"/);
  assert.match(home, /<StartReadingShelf[\s\S]*items=\{readingPicks\}[\s\S]*columns=\{3\}/);
  assert.ok(home.indexOf('className={styles.hero}') < home.indexOf('className={styles.signup}'));
  assert.ok(home.indexOf('className={styles.signup}') < home.indexOf('items={readingPicks}'));
  assert.doesNotMatch(home, /entryPaths|workLane|FeaturedCollectionCard|ContinueReadingBanner|ContinueToyBanner/);
  const footerSignup = source('app/components/FooterSubscribe.tsx');
  assert.match(footerSignup, /pathname === '\/'/);
});

test('projects is the landing door for builds, case studies, portfolio, and toys', () => {
  const projects = source('app/components/ProjectsIndex.tsx');

  assert.match(projects, /href: '#project-index'/);
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
});

test('site-owned signup surfaces use one first-party form implementation', () => {
  // FooterSubscribe is excluded: email signups are currently paused
  // site-wide and it's a no-op stub rather than a SubscriptionForm caller.
  const surfaces = [
    'app/components/ProjectsIndex.tsx',
    'app/(frontend)/bio/page.tsx',
    'app/(frontend)/latest/page.tsx',
  ];

  for (const path of surfaces) {
    const contents = source(path);
    assert.match(contents, /SubscriptionForm/);
    assert.doesNotMatch(contents, /ActiveCampaignForm/);
  }
});

test('writing is an accessible section door to fiction, essays, and bibliography', () => {
  const writing = source('app/(frontend)/writing/page.tsx');

  assert.match(writing, /title: 'Fiction', href: '\/stories'/);
  assert.match(writing, /title: 'Essays', href: '\/essays'/);
  assert.match(writing, /title: 'Bibliography', href: '\/bibliography'/);
});
