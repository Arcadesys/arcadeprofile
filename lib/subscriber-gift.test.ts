import assert from 'node:assert/strict';
import test from 'node:test';
import { SUBSCRIBER_GIFT, subscriberGiftFiles, type SubscriberGift } from './subscriber-gift';
import { VALID_MAGNETS } from './subscribe-types';

test('the new exclusive replaces the retired story magnet without exposing placeholder links', () => {
  assert.ok(VALID_MAGNETS.includes('subscriber-exclusive'));
  assert.ok(!VALID_MAGNETS.some((magnet: string) => magnet === 'story'));
  for (const file of subscriberGiftFiles()) assert.doesNotMatch(file.url, /\[|\]/);
  assert.deepEqual(subscriberGiftFiles({ ...SUBSCRIBER_GIFT, files: [{ url: '[EXCLUSIVE PIECE PDF URL]', filename: 'gift.pdf', label: 'PDF' }] }), []);
});

test('only a fully configured set of gift files is offered', () => {
  const configured: SubscriberGift = { title: 'Approved piece', description: 'Approved description.', files: [
    { url: 'https://downloads.example.com/exclusive.pdf', filename: 'exclusive.pdf', label: 'PDF' },
    { url: '/lead-magnets/exclusive.epub', filename: 'exclusive.epub', label: 'EPUB' },
  ] };
  assert.deepEqual(subscriberGiftFiles(configured), configured.files);
  for (const url of ['[EXCLUSIVE PIECE PDF URL]', 'https://example.invalid/gift.pdf', '//example.com/gift.pdf', 'javascript:alert(1)', '/lead-magnets/[TITLE].pdf']) {
    assert.deepEqual(subscriberGiftFiles({ ...configured, files: [...configured.files, { url, filename: 'gift.pdf', label: 'PDF' }] }), []);
  }
  assert.deepEqual(subscriberGiftFiles({ ...configured, files: [] }), []);
});
