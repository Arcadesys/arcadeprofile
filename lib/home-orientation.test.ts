import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('homepage has one compact hero signup and the reader-first conversion copy', () => {
  const home = source('app/(frontend)/page.tsx');

  assert.match(home, /<h1 className=\{styles\.title\}>Read the strange little fire\.<\/h1>/);
  assert.match(home, /Speculative fiction, essays, and build notes by Austen Tucker\. New work every two weeks\. Free by email\./);
  assert.equal((home.match(/<ActiveCampaignForm source="home-hero"/g) ?? []).length, 1);
  assert.match(home, /<Link className=\{styles\.button\} href="\/writing">Start Here/);
  assert.match(home, /<Link className=\{styles\.latestLink\} href="\/latest">Latest/);
});

test('writing is an accessible section door to fiction, essays, and bibliography', () => {
  const writing = source('app/(frontend)/writing/page.tsx');

  assert.match(writing, /title: 'Fiction', href: '\/stories'/);
  assert.match(writing, /title: 'Essays', href: '\/essays'/);
  assert.match(writing, /title: 'Bibliography', href: '\/bibliography'/);
});
