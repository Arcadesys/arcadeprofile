import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('homepage has the reader-first conversion copy with signups currently paused', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<h1 className=\{styles\.title\}>Read the strange little fire\.<\/h1>/);
  assert.doesNotMatch(home, /New work every two weeks/);
  // Email signups are paused site-wide (see SubscriptionForm.tsx); the
  // homepage hero intentionally has no <SubscriptionForm /> right now.
  assert.doesNotMatch(home, /<SubscriptionForm/);
  assert.match(home, /<Link className=\{styles\.button\} href="\/writing">Start Here/);
  assert.match(home, /<Link className=\{styles\.latestLink\} href="\/latest">Latest/);
});

test('projects is the landing door for builds, case studies, portfolio, and toys', () => {
  const projects = source('app/components/ProjectsIndex.tsx');

  assert.match(projects, /href: '#project-index'/);
  assert.match(projects, /href: '\/lab'/);
  assert.match(projects, /href: '\/portfolio'/);
  assert.match(projects, /href: '\/toys'/);
  assert.match(projects, /<Link key=\{section.image\} href=\{section.href\}>/);
  assert.match(projects, /id="project-index"/);
});

test('site-owned signup surfaces use one first-party form implementation', () => {
  // FooterSubscribe is excluded: email signups are currently paused
  // site-wide and it's a no-op stub rather than a SubscriptionForm caller.
  const surfaces = [
    'app/components/ProjectsIndex.tsx',
    'app/(frontend)/bio/page.tsx',
    'app/(frontend)/latest/page.tsx',
    'app/(frontend)/store/page.tsx',
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
