import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { getHomeFooterNavItems } from './home-footer-nav';
import { ORIENTATION_NAV_ITEMS } from './nav-items';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('homepage leads with the promise, then what to read next, then the book and signup', () => {
  const home = source('app/(frontend)/page.tsx');
  const brand = source('lib/site-brand.ts');

  assert.match(brand, /SITE_PROMISE_HEADLINE = 'Strange fiction with heart\.'/);
  assert.match(brand, /SITE_PROMISE_LINE = 'Everything here used to be something else\.'/);
  assert.match(home, /<h1 id="home-promise-heading">\{SITE_PROMISE_HEADLINE\}<\/h1>/);
  assert.match(home, /<p className=\{styles\.tagline\}>\{SITE_PROMISE_LINE\}<\/p>/);
  assert.match(home, /<p className=\{styles\.signupCopy\}>\{SITE_PROMISE\}<\/p>/);
  assert.match(home, /heading="What to read next"/);
  assert.match(home, /getBook\('this-is-what-i-do-for-fun'\)/);
  assert.match(home, /headingAs="h2"[\s\S]*placement="home_hero"/);
  assert.equal((home.match(/<h1/g) ?? []).length, 1);
  assert.match(home, /pitch="Strange lives, remade\."/);
  assert.match(home, /<SubscriptionForm[\s\S]*audiences=\{\['all'\]\}[\s\S]*magnet="carl"/);
  assert.match(home, /<StartReadingShelf[\s\S]*items=\{readingPicks\}[\s\S]*columns=\{3\}/);
  assert.ok(home.indexOf('className={styles.promise}') < home.indexOf('items={readingPicks}'));
  assert.ok(home.indexOf('items={readingPicks}') < home.indexOf('className={styles.signup}'));
  assert.ok(home.indexOf('className={styles.signup}') < home.indexOf('className={styles.hero}'));
  assert.doesNotMatch(home, /entryPaths|workLane|FeaturedCollectionCard|ContinueToyBanner/);
  const footerSignup = source('app/components/FooterSubscribe.tsx');
  assert.match(footerSignup, /pathname === '\/'/);
});

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

test('writing is an accessible section door to fiction, essays, and bibliography', () => {
  const writing = source('app/(frontend)/writing/page.tsx');

  assert.match(writing, /title: 'Fiction', href: '\/stories'/);
  assert.match(writing, /title: 'Essays', href: '\/essays'/);
  assert.match(writing, /title: 'Bibliography', href: '\/bibliography'/);
});

test('homepage mounts the resume banner under the brand bar with the public reading catalog', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<ContinueReadingBanner availablePaths=\{catalog\.map\(\(piece\) => piece\.canonicalPath\)\} \/>/);
  assert.match(home, /getReadingCatalog\(\)/);
  assert.ok(home.indexOf('</header>') < home.indexOf('<ContinueReadingBanner'));
  assert.ok(home.indexOf('<ContinueReadingBanner') < home.indexOf('className={styles.release}'));
  assert.match(source('app/components/ContinueReadingBanner.tsx'), /availablePaths = \[\]/);
});

test('homepage footer names destinations exactly as the rail does', () => {
  const items = getHomeFooterNavItems();
  const onSite = ORIENTATION_NAV_ITEMS.filter((item) => item.href.startsWith('/'));

  assert.deepEqual(items.map(({ label, href }) => [label, href]), onSite.map(({ label, href }) => [label, href]));
  assert.deepEqual(items.map((item) => item.label), ['Read', 'Blog', 'Books', 'About']);
  assert.ok(items.every((item) => !/^https?:/.test(item.href)), 'off-site links stay out of the home footer');

  const home = source('app/(frontend)/page.tsx');
  assert.match(home, /<HomeFooterNav \/>/);
  assert.doesNotMatch(home, /About Austen|All books/);
  assert.match(source('app/components/HomeFooterNav.tsx'), /aria-label="More from The Arcades"/);
  assert.match(source('app/components/HomeFooterNav.tsx'), /getHomeFooterNavItems\(\)/);
});
