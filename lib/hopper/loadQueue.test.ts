import assert from 'node:assert/strict';
import test from 'node:test';

import { extractQueueIds, loadLiveQueueIds } from './loadQueue';

test('extractQueueIds normalizes strict numeric post ids', () => {
  assert.deepEqual(
    extractQueueIds([
      { post: '001' },
      { post: { id: 2 } },
      { post: '3.5' },
      { post: '0x10' },
      { post: 4 },
      { post: { id: '5e2' } },
      { post: { id: '6' } },
    ]),
    ['2', '4', '6'],
  );
});

test('loadLiveQueueIds keeps queued legacy posts with missing publish_status', async () => {
  const posts = [
    { id: 1, publish_status: null },
    { id: 2, publish_status: 'draft' },
    { id: 3, publish_status: 'scheduled' },
    { id: 4, publish_status: 'published' },
    { id: 5, publish_status: 'sent' },
  ];

  const payload = {
    async findGlobal() {
      return {
        fictionQueue: [{ post: 1 }, { post: 2 }, { post: 4 }],
        essaysQueue: [{ post: 3 }, { post: 5 }],
      };
    },
    async find() {
      return { docs: posts };
    },
  };

  const result = await loadLiveQueueIds(payload as never);

  assert.deepEqual(result.fictionIds, ['1', '2']);
  assert.deepEqual(result.essaysIds, ['3']);
});
