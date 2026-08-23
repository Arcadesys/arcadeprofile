import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ensureCollectionNavItem,
  buildNavigationModel,
  ensureCoreNavItems,
  ensureLabNavItem,
  ensurePortfolioNavItem,
  ensureToysNavItem,
} from './nav-items';

test('ensureToysNavItem inserts Toys after Projects when CMS navigation omits it', () => {
  const items = ensureToysNavItem([
    { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
    { id: 'bio', label: 'Bio', href: '/bio', isPrimary: false },
  ]);

  assert.deepEqual(items.map((item) => item.href), ['/projects', '/toys', '/bio']);
});

test('ensureToysNavItem does not duplicate a CMS-managed Toys entry', () => {
  const items = [
    { id: 'toys', label: 'Playthings', href: '/toys', isPrimary: true },
  ];

  assert.strictEqual(ensureToysNavItem(items), items);
});

test('ensurePortfolioNavItem inserts Portfolio after Projects', () => {
  const items = ensurePortfolioNavItem([
    { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
    { id: 'bio', label: 'Bio', href: '/bio', isPrimary: false },
  ]);

  assert.deepEqual(items.map((item) => item.href), ['/projects', '/portfolio', '/bio']);
});

test('ensureLabNavItem inserts Lab after Portfolio', () => {
  const items = ensureLabNavItem([
    { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
    { id: 'portfolio', label: 'Portfolio', href: '/portfolio', isPrimary: false },
    { id: 'bio', label: 'Bio', href: '/bio', isPrimary: false },
  ]);

  assert.deepEqual(items.map((item) => item.href), ['/projects', '/portfolio', '/lab', '/bio']);
  assert.equal(items.find((item) => item.href === '/lab')?.label, 'Case Studies');
});

test('ensureCoreNavItems keeps fallback destinations available for the editorial navigation model', () => {
  const items = ensureCoreNavItems([
    { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
    { id: 'bio', label: 'Bio', href: '/bio', isPrimary: false },
  ]);

  assert.deepEqual(
    items.map((item) => item.href),
    [
      '/projects', '/portfolio', '/lab', '/this-is-what-i-do-for-fun', '/toys',
      '/bio', '/stories', '/essays', '/subscribe',
    ],
  );
});

test('ensureCollectionNavItem does not duplicate a CMS-managed Stories entry', () => {
  const items = [
    { id: 'stories', label: 'Short fiction', href: '/this-is-what-i-do-for-fun', isPrimary: false },
  ];

  assert.strictEqual(ensureCollectionNavItem(items), items);
});

test('buildNavigationModel reserves the compact header for editorial essentials', () => {
  const model = buildNavigationModel([
    { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
    { id: 'stories', label: 'Stories', href: '/stories', isPrimary: false },
    { id: 'essays', label: 'Essays', href: '/essays', isPrimary: false },
    { id: 'lab', label: 'Case Studies', href: '/lab', isPrimary: false },
    { id: 'about', label: 'About', href: '/bio', isPrimary: false },
    { id: 'subscribe', label: 'Subscribe', href: '/subscribe', isPrimary: true },
    { id: 'toys', label: 'Toys', href: '/toys', isPrimary: false },
  ]);

  assert.deepEqual(model.primary.map((item) => item.href), [
    '/stories', '/essays', '/lab', '/bio', '/subscribe',
  ]);
  assert.deepEqual(model.more.map((item) => item.href), ['/projects', '/toys']);
});
