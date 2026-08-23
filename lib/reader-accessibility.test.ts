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

test('homepage uses one subscription form and secondary publication actions', () => {
  const footerSubscribe = source('app/components/FooterSubscribe.tsx');
  const homepage = source('app/(frontend)/page.tsx');

  assert.match(footerSubscribe, /new Set\(\['\/'/);
  assert.match(homepage, /showRead=\{false\}/);
});

test('project prose has an article landmark and mobile controls have accessible sizing', () => {
  const projectPost = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');
  const css = source('app/globals.css');

  assert.match(projectPost, /<article className="longform-article">/);
  assert.match(css, /\.reading-dock \.seg button[\s\S]*?min-height: 44px[\s\S]*?font-size: 1rem/);
  assert.match(css, /\.dd-toggle[\s\S]*?position: static[\s\S]*?min-height: 56px/);
});
