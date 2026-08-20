import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ensureCollectionNavItem,
  ensureCoreNavItems,
  ensureLabNavItem,
  ensurePortfolioNavItem,
  ensureToysNavItem,
  loadVisibleNavItems,
} from './nav-items';

type NavPayload = Parameters<typeof loadVisibleNavItems>[0];

test('loadVisibleNavItems reads every visible nav item without a fixed cap', async () => {
  const docs = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    label: `Item ${i + 1}`,
    href: `/item-${i + 1}`,
    isPrimary: i === 24,
  }));
  const calls: unknown[] = [];
  const payload = {
    async find(args: unknown) {
      calls.push(args);
      return { docs };
    },
  } as unknown as NavPayload;

  const items = await loadVisibleNavItems(payload);

  assert.equal(items.length, 25);
  assert.deepEqual(items[24], {
    id: '25',
    label: 'Item 25',
    href: '/item-25',
    isPrimary: true,
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    collection: 'nav-items',
    where: { visible: { equals: true } },
    sort: 'order',
    depth: 0,
    pagination: false,
  });
});

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
});

test('ensureCoreNavItems keeps Portfolio, Lab, Stories, and Toys in a predictable order', () => {
  const items = ensureCoreNavItems([
    { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
    { id: 'bio', label: 'Bio', href: '/bio', isPrimary: false },
  ]);

  assert.deepEqual(
    items.map((item) => item.href),
    ['/projects', '/portfolio', '/lab', '/this-is-what-i-do-for-fun', '/toys', '/bio'],
  );
});

test('ensureCollectionNavItem does not duplicate a CMS-managed Stories entry', () => {
  const items = [
    { id: 'stories', label: 'Short fiction', href: '/this-is-what-i-do-for-fun', isPrimary: false },
  ];

  assert.strictEqual(ensureCollectionNavItem(items), items);
});
