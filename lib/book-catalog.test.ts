import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import { BOOKS, HOME_BOOKS, bookStatusLabel, getBook } from '../data/books';
import { bookJsonLd } from './book-schema';
import { COLLECTION } from './collection';

test('the eight-story book sells Kindle first and keeps the seven free stories separate', () => {
  const book = getBook('this-is-what-i-do-for-fun')!;
  assert.equal(book.publisher, 'Free Play Publishing');
  assert.equal(book.releaseYear, 2026);
  assert.equal(book.actions[0].label, 'Buy on Kindle · $4.99');
  assert.equal(book.actions[0].href, 'https://www.amazon.com/dp/B0HM8J2Z87');
  assert.equal(book.actions[0].kind, 'purchase');
  assert.equal(book.actions[1].label, 'Read seven stories free');
  assert.equal(book.actions[1].href, '/this-is-what-i-do-for-fun');
  assert.equal(COLLECTION.length, 7);
  assert.ok(!COLLECTION.some((story) => story.slug === 'foxtails'));
  assert.match(book.description, /Eight stories/);
  assert.match(book.description, /Foxtails is only in the book/);
  assert.ok(existsSync(`public${book.coverImage}`));
  assert.equal(HOME_BOOKS[0].coverImage, book.coverImage);
});

test('unverified paperback has its ISBN and price but no purchase link or offer', () => {
  const book = getBook('this-is-what-i-do-for-fun')!;
  assert.deepEqual(book.paperback, { isbn: '9798160804194', price: '12.99', status: 'coming-soon' });
  assert.ok(!book.actions.some((action) => action.bookFormat === 'Paperback'));
  const schema = bookJsonLd(book);
  assert.equal(schema.isbn, '9798160804194');
  assert.equal(schema.workExample?.[0].bookFormat, 'https://schema.org/Paperback');
  assert.equal(schema.offers?.length, 1);
  assert.equal(schema.offers[0].price, '4.99');
  assert.equal(schema.offers[0].priceCurrency, 'USD');
  assert.equal(schema.offers[0].url, book.actions[0].href);
  assert.equal(schema.offers[0].itemOffered.bookFormat, 'https://schema.org/EBook');
});

test('original Bait and Switch remains available while The Painted Cat is out of circulation', () => {
  const bait = getBook('bait-and-switch')!;
  assert.equal(bait.stage, 'available');
  assert.equal(bait.author, 'Austen Crowder');
  assert.equal(bait.publisher, 'Anthropomorphic Dreams Publishing');
  assert.equal(bait.releaseYear, 2010);
  assert.deepEqual(bait.actions.map((action) => action.href), [
    'https://www.amazon.com/dp/145631890X', 'https://www.amazon.com/dp/B004XD9WZO',
  ]);
  assert.match(bait.editionNote!, /new Free Play Publishing edition is coming in 2027/);
  const painted = getBook('the-painted-cat')!;
  assert.equal(painted.author, 'Austen Crowder');
  assert.equal(painted.releaseYear, 2015);
  assert.equal(bookStatusLabel(painted), 'Out of circulation');
  assert.deepEqual(painted.actions, []);
  assert.equal(bookJsonLd(painted).offers, undefined);
  assert.match(painted.editionNote!, /author’s request/);
  assert.match(painted.editionNote!, /new Free Play Publishing edition is planned for 2027/);
});

test('backlist Kindle prices and author names match the confirmed catalog', () => {
  for (const [slug, author, asin] of [
    ['closet-cats', undefined, 'B0B311T8P1'],
    ['a-fuzzy-place', 'Austen Crowder', 'B00H7K7EYQ'],
  ]) {
    const book = getBook(slug!)!;
    assert.equal(book.author, author);
    assert.equal(book.actions[0].price, '0.99');
    assert.equal(book.actions[0].href, `https://www.amazon.com/dp/${asin}`);
  }
  for (const book of BOOKS.filter((item) => item.stage !== 'available')) {
    assert.equal(bookJsonLd(book).offers, undefined, `${book.slug} must have no sale offers`);
  }
});
