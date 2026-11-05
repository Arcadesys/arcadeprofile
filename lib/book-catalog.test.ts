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
  assert.equal(book.actions[2].label, 'Read seven stories free');
  assert.equal(book.actions[2].href, '/this-is-what-i-do-for-fun');
  assert.equal(COLLECTION.length, 7);
  assert.ok(!COLLECTION.some((story) => story.slug === 'foxtails'));
  assert.match(book.description, /Eight stories/);
  assert.match(book.description, /Foxtails is only in the book/);
  assert.ok(existsSync(`public${book.coverImage}`));
  assert.equal(HOME_BOOKS[0].coverImage, book.coverImage);
});

test('the user-verified paperback has its ISBN, clean purchase URL and USD offer', () => {
  const book = getBook('this-is-what-i-do-for-fun')!;
  assert.deepEqual(book.paperback, { isbn: '9798160804194', price: '12.99', status: 'available' });
  assert.equal(book.actions[1].label, 'Buy the paperback · $12.99');
  assert.equal(book.actions[1].href, 'https://www.amazon.com/dp/B0HMFDFVNH');
  assert.equal(book.actions[1].external, true);
  const schema = bookJsonLd(book);
  assert.equal(schema.isbn, '9798160804194');
  assert.equal(schema.workExample?.[0].bookFormat, 'https://schema.org/Paperback');
  assert.equal(schema.offers?.length, 2);
  assert.equal(schema.offers[0].price, '4.99');
  assert.equal(schema.offers[0].priceCurrency, 'USD');
  assert.equal(schema.offers[0].url, book.actions[0].href);
  assert.equal(schema.offers[0].itemOffered.bookFormat, 'https://schema.org/EBook');
  assert.equal(schema.offers[1].price, '12.99');
  assert.equal(schema.offers[1].priceCurrency, 'USD');
  assert.equal(schema.offers[1].url, 'https://www.amazon.com/dp/B0HMFDFVNH');
  assert.equal(schema.offers[1].itemOffered.bookFormat, 'https://schema.org/Paperback');
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
  for (const book of BOOKS.filter((item) => item.stage !== 'available' && !item.actions.some((action) => action.kind === 'purchase' && action.availability === 'preorder'))) {
    assert.equal(bookJsonLd(book).offers, undefined, `${book.slug} must have no sale offers`);
  }
});

test('Estelle’s Children announces the November release without claiming immediate delivery', () => {
  const book = getBook('estelles-children')!;
  assert.equal(book.stage, 'forthcoming');
  assert.equal(book.releaseDate, '2026-11-30');
  assert.equal(book.coverImage, 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/images/b15b8caee1e94d28ee2cac9ea662f9a2fb0740ea1c3432ad8dea599cc579fddd/estelles-children-approved-cover.webp');
  assert.match(book.coverAlt!, /Cover of Estelle’s Children by Austen Tucker/);
  assert.match(book.coverAlt!, /brown journal/);
  assert.equal(bookJsonLd(book).image, book.coverImage);
  assert.equal(bookStatusLabel(book), 'Releases November 30, 2026');
  assert.match(book.editionNote!, /ebook is available for preorder/);
  assert.equal(bookJsonLd(book).datePublished, '2026-11-30');
});

test('preorders use PreOrder availability while existing purchases remain InStock', () => {
  const book = getBook('estelles-children')!;
  assert.equal(book.actions[0].href, 'https://www.amazon.com/dp/B0HQ8NL2SX');
  assert.equal(book.actions[0].label, 'Preorder the ebook');
  assert.equal(book.actions[0].kind, 'purchase');
  const schema = bookJsonLd(book);
  assert.equal(schema.offers?.[0].url, 'https://www.amazon.com/dp/B0HQ8NL2SX');
  assert.equal(schema.offers?.[0].availability, 'https://schema.org/PreOrder');
  assert.ok(bookJsonLd(getBook('this-is-what-i-do-for-fun')!).offers?.every((offer) => offer.availability === 'https://schema.org/InStock'));
});
