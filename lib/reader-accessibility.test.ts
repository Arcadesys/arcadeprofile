import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('reader controls are unified, modal, and mounted once in navigation', () => {
  const layout = source('app/(frontend)/layout.tsx');
  const navbar = source('app/components/NavbarClient.tsx');
  const reader = source('app/components/ReadingDock.tsx');

  assert.match(navbar, /<ReadingDock\b/);
  assert.doesNotMatch(layout, /<DockStack\b/);
  assert.match(reader, /<LightsToggle\s*\/>/);
  assert.match(reader, /role="dialog"/);
  assert.match(reader, /hidden=!open|hidden=\{!open\}/);
  assert.match(reader, /aria-controls="reading-panel"/);
});

test('global shell exposes a keyboard skip target', () => {
  const layout = source('app/(frontend)/layout.tsx');

  assert.match(layout, /href="#main-content"/);
  assert.match(layout, /id="main-content"/);
  assert.match(layout, />Skip to content</);
});

test('homepage uses secondary publication actions with signups currently paused', () => {
  const footerSubscribe = source('app/components/FooterSubscribe.tsx');
  const homepage = source('app/(frontend)/page.tsx');

  // FooterSubscribe is a no-op stub while email signups are paused
  // site-wide; it no longer carries a per-route form exemption list.
  assert.match(footerSubscribe, /return null/);
  assert.match(homepage, /showRead=\{false\}/);
});

test('project prose has an article landmark and mobile controls have accessible sizing', () => {
  const projectPost = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');
  const css = source('app/globals.css');

  assert.match(projectPost, /<article className="longform-article">/);
  assert.match(css, /\.reading-dock \.seg button[\s\S]*?min-height: 44px[\s\S]*?font-size: 1rem/);
  assert.match(css, /\.dd-toggle[\s\S]*?position: static[\s\S]*?min-height: 56px/);
});

test('long-form routes place one contextual signup before their next-step navigation', () => {
  const projectPost = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');
  const zooChapter = source('app/(frontend)/novels/it-takes-a-zoo/[chapter]/page.tsx');
  const collectionStory = source('app/(frontend)/this-is-what-i-do-for-fun/[slug]/page.tsx');
  const portfolioPiece = source('app/(frontend)/portfolio/[slug]/page.tsx');
  const labCaseStudy = source('app/(frontend)/lab/[slug]/page.tsx');

  assert.ok(projectPost.indexOf('<ReadingNextSteps') < projectPost.indexOf('<EndOfPieceSubscribe'));
  assert.ok(zooChapter.indexOf('<ReadingNextSteps') < zooChapter.indexOf('<EndOfPieceSubscribe'));
  assert.ok(collectionStory.indexOf('<ReadingNextSteps') < collectionStory.indexOf('<EndOfPieceSubscribe'));
  assert.ok(portfolioPiece.indexOf('<ReadingNextSteps') < portfolioPiece.indexOf('<EndOfPieceSubscribe'));
  assert.ok(labCaseStudy.indexOf('<EndOfPieceSubscribe') < labCaseStudy.indexOf('<div className={styles.pieceActions}>'));
  // FooterSubscribe is a no-op stub while email signups are paused
  // site-wide, so it no longer carries per-route exemption strings.
});

test('project captures map fiction, writing, and build work to their matching lists', () => {
  const projectPost = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');

  assert.match(projectPost, /project\.category === 'fiction'[\s\S]*?'fiction'/);
  assert.match(projectPost, /project\.category === 'writing'[\s\S]*?'essays'/);
  assert.match(projectPost, /:\s*'lab';/);
});

test('project article metadata makes local hero images absolute', () => {
  const projectPost = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');

  assert.match(projectPost, /image: absoluteSiteUrl\(post\.hero\?\.src \?\? DEFAULT_SOCIAL_IMAGE\.url\)/);
});

test('subscription form keeps large controls, visible status, and focus repair', () => {
  const form = source('app/components/SubscriptionForm.tsx');
  const css = source('app/components/SubscriptionForm.module.css');

  assert.match(form, /aria-live|role="status"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /autoComplete="email"/);
  assert.match(form, /statusRef\.current\?\.focus/);
  assert.match(css, /min-height: 56px/);
  assert.match(css, /font-size: 18px/);
  assert.match(css, /min-height: 44px/);
});

test('reader telemetry initializes Vercel before cold-load reader effects', () => {
  const telemetry = source('lib/reader-analytics.ts');

  assert.match(telemetry, /useLayoutEffect/);
  assert.match(telemetry, /initializeReaderAnalytics\(\)/);
  assert.match(telemetry, /injectAnalytics\(\{ framework: 'react' \}\)/);
});
