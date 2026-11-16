import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { BROOMSTICKS_GIFT, CARL_GIFT, giftForMagnet, SUBSCRIBER_GIFT, subscriberGiftFiles, type SubscriberGift } from './subscriber-gift';
import { VALID_MAGNETS } from './subscribe-types';

test('Carl is the sitewide gift with real files; Broomsticks stays on the Estelle page', () => {
  assert.ok(VALID_MAGNETS.includes('subscriber-exclusive'));
  assert.ok(VALID_MAGNETS.includes('carl'));
  assert.ok(!VALID_MAGNETS.some((magnet: string) => magnet === 'story'));
  assert.equal(SUBSCRIBER_GIFT, CARL_GIFT);
  assert.equal(giftForMagnet('carl'), CARL_GIFT);
  assert.equal(giftForMagnet('subscriber-exclusive'), BROOMSTICKS_GIFT);
  assert.equal(giftForMagnet('it-takes-a-zoo-complete'), null);
  assert.equal(giftForMagnet('toString'), null);

  // Austen's bound Carl PDF and the EPUB built from their ebook text.
  assert.equal(CARL_GIFT.title, 'Carl');
  assert.deepEqual(CARL_GIFT.files.map((file) => file.url), ['/lead-magnets/carl.pdf', '/lead-magnets/carl.epub']);
  assert.equal(subscriberGiftFiles(CARL_GIFT).length, 2);
  assertRealFiles(CARL_GIFT);

  assert.equal(BROOMSTICKS_GIFT.title, 'Broomsticks');
  assert.match(BROOMSTICKS_GIFT.description, /opening story of Estelle's Children/);
  assert.doesNotMatch(BROOMSTICKS_GIFT.description, /not in (any|the) book|nowhere else/i);
  assert.equal(subscriberGiftFiles(BROOMSTICKS_GIFT).length, 2);
  assertRealFiles(BROOMSTICKS_GIFT);
  assert.deepEqual(subscriberGiftFiles({ ...BROOMSTICKS_GIFT, files: [{ url: '[EXCLUSIVE PIECE PDF URL]', filename: 'gift.pdf', label: 'PDF' }] }), []);
});

function assertRealFiles(gift: SubscriberGift) {
  for (const file of subscriberGiftFiles(gift)) {
    const bytes = fs.readFileSync(path.join(process.cwd(), 'public', file.url));
    assert.ok(bytes.length > 1000);
    assert.equal(bytes.subarray(0, file.label === 'PDF' ? 5 : 2).toString(), file.label === 'PDF' ? '%PDF-' : 'PK');
    if (file.label === 'EPUB') assert.equal(bytes.subarray(30, 58).toString(), 'mimetypeapplication/epub+zip');
  }
}

test('signup boxes offer Carl everywhere except the Estelle page', () => {
  for (const page of ['app/(frontend)/page.tsx', 'app/(frontend)/subscribe/page.tsx', 'app/(frontend)/bio/page.tsx']) {
    const source = fs.readFileSync(path.join(process.cwd(), page), 'utf8');
    assert.match(source, /magnet="carl"/, page);
    assert.doesNotMatch(source, /magnet="subscriber-exclusive"/, page);
  }
  const home = fs.readFileSync(path.join(process.cwd(), 'app/(frontend)/page.tsx'), 'utf8');
  assert.match(home, /Get <em>Carl<\/em> free/);
  assert.match(home, /submitLabel="Get Carl free"/);
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
  const configured: SubscriberGift = { title: 'Approved piece', offerLabel: 'Free', description: 'Approved description.', files: [
    { url: 'https://downloads.example.com/exclusive.pdf', filename: 'exclusive.pdf', label: 'PDF' },
    { url: '/lead-magnets/exclusive.epub', filename: 'exclusive.epub', label: 'EPUB' },
  ] };
  assert.deepEqual(subscriberGiftFiles(configured), configured.files);
  for (const url of ['[EXCLUSIVE PIECE PDF URL]', 'https://example.invalid/gift.pdf', '//example.com/gift.pdf', 'javascript:alert(1)', '/lead-magnets/[TITLE].pdf']) {
    assert.deepEqual(subscriberGiftFiles({ ...configured, files: [...configured.files, { url, filename: 'gift.pdf', label: 'PDF' }] }), []);
  }
  assert.deepEqual(subscriberGiftFiles({ ...configured, files: [] }), []);
});
