import assert from 'node:assert/strict';
import test from 'node:test';

import { loadVisibleNavItems } from './nav-items';

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
