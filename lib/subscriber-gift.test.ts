import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { SUBSCRIBER_GIFT, subscriberGiftFiles, type SubscriberGift } from './subscriber-gift';
import { VALID_MAGNETS } from './subscribe-types';

test('the new exclusive replaces the retired story magnet without exposing placeholder links', () => {
  assert.ok(VALID_MAGNETS.includes('subscriber-exclusive'));
  assert.ok(!VALID_MAGNETS.some((magnet: string) => magnet === 'story'));
  for (const file of subscriberGiftFiles()) assert.doesNotMatch(file.url, /\[|\]/);
  assert.equal(SUBSCRIBER_GIFT.title, 'Broomsticks');
  assert.match(SUBSCRIBER_GIFT.description, /opening story of Estelle's Children/);
  assert.doesNotMatch(SUBSCRIBER_GIFT.description, /not in (any|the) book|nowhere else/i);
  assert.equal(subscriberGiftFiles().length, 2);
  for (const file of subscriberGiftFiles()) {
    const bytes = fs.readFileSync(path.join(process.cwd(), 'public', file.url));
    assert.ok(bytes.length > 1000);
    assert.equal(bytes.subarray(0, file.label === 'PDF' ? 5 : 2).toString(), file.label === 'PDF' ? '%PDF-' : 'PK');
  }
  assert.deepEqual(subscriberGiftFiles({ ...SUBSCRIBER_GIFT, files: [{ url: '[EXCLUSIVE PIECE PDF URL]', filename: 'gift.pdf', label: 'PDF' }] }), []);
});

test('the Estelle preview offers the opening by signup without publishing its body', () => {
  const page = fs.readFileSync(new URL('../app/(frontend)/novels/estelles-children/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Read the opening story first/);
  assert.match(page, /source="novel-preview"/);
  assert.match(page, /audiences=\{\['fiction'\]\}/);
  assert.match(page, /magnet="subscriber-exclusive"/);
  assert.doesNotMatch(page, /Broomsticks shared a storefront|\/lead-magnets\/broomsticks/);
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
