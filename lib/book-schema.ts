import { bookPath, type BookInfo } from '@/data/books';
import { SITE_URL } from './site-url';

export function bookJsonLd(book: BookInfo) {
  const url = `${SITE_URL}${bookPath(book)}`;
  const offers = book.actions.filter((action) => action.kind === 'purchase').map((action) => ({
    '@type': 'Offer',
    url: action.href,
    availability: 'https://schema.org/InStock',
    ...(action.price ? { price: action.price, priceCurrency: 'USD' } : {}),
    itemOffered: {
      '@type': 'Book',
      name: book.title,
      bookFormat: `https://schema.org/${action.bookFormat}`,
    },
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${url}#book`,
    name: book.title,
    description: book.description,
    url,
    author: book.author
      ? { '@type': 'Person', name: book.author }
      : { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: url,
    ...(book.coverImage ? { image: `${SITE_URL}${book.coverImage}` } : {}),
    ...(book.publisher ? { publisher: { '@type': 'Organization', name: book.publisher } } : {}),
    ...(book.series ? {
      isPartOf: {
        '@type': 'BookSeries',
        name: book.series,
        ...(book.seriesPosition ? { position: book.seriesPosition } : {}),
      },
    } : {}),
    ...(book.releaseYear && (book.stage === 'available' || book.stage === 'out-of-print')
      ? { datePublished: String(book.releaseYear) } : {}),
    ...(offers.length ? { offers } : {}),
    ...(book.paperback ? {
      isbn: book.paperback.isbn,
      workExample: [{
        '@type': 'Book',
        name: book.title,
        bookFormat: 'https://schema.org/Paperback',
        isbn: book.paperback.isbn,
      }],
    } : {}),
  };
}
