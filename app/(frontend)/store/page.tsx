import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Image from 'next/image';
import SubscriptionForm from '@/app/components/SubscriptionForm';
import { books as bookData } from '@/data/books';

export const metadata: Metadata = {
  title: 'Store',
  description: 'Books by Austen Tucker-Crowder.',
  alternates: { canonical: '/store' },
  openGraph: {
    type: 'website',
    title: `Store | ${SITE_NAME}`,
    description: 'Books by Austen Tucker-Crowder.',
    url: '/store',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Store | ${SITE_NAME}`,
    description: 'Books by Austen Tucker-Crowder.',
  },
};

type Book = {
  key: string;
  title: string;
  description: string;
  coverImage: string;
  buyLink: string;
  buyLabel: string;
};

const books: Book[] = Object.entries(bookData).flatMap(([key, book]) => {
  if (!book.hasBuyButton || !book.buyLink || !book.coverImage) return [];
  return [{
    key,
    title: book.title,
    description: book.description,
    coverImage: book.coverImage,
    buyLink: book.buyLink,
    buyLabel: book.buyLabel ?? 'Buy',
  }];
});

export default function StorePage() {
  return (
    <div className="w-full px-4 py-8">
      <div
        className="austenbox"
        style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}
      >
        <h1 className="gaysparkles mb-3 text-center text-3xl font-bold">Store</h1>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-[var(--fg-muted)]">
          Books by Austen Tucker-Crowder. Most are available on Amazon; one lives at FurPlanet.
        </p>

        <section id="subscribe" style={{ maxWidth: '680px', margin: '0 auto 2.5rem' }}>
          <SubscriptionForm
            source="store-top"
            audiences={['all']}
            updateMode="add"
            magnet="story"
            presentation="compact"
            submitLabel="Send me new work"
          />
        </section>

        <div className="space-y-6">
          {books.map((book) => (
            <article
              key={book.key}
              className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 md:flex-row"
            >
              <div className="w-full flex-shrink-0 md:w-1/4 lg:w-1/5">
                <Image
                  src={book.coverImage}
                  alt={`Cover for ${book.title}`}
                  width={300}
                  height={450}
                  className="h-auto w-full rounded-lg object-cover"
                />
              </div>

              <div className="flex flex-grow flex-col">
                <h2 className="mb-2 text-xl font-semibold text-[var(--fg)]">
                  {book.title}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-[var(--fg-muted)]">
                  {book.description}
                </p>
                <div className="mt-auto">
                  <a
                    href={book.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-link"
                  >
                    {book.buyLabel}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p style={{ maxWidth: '680px', margin: '3rem auto 0', fontSize: '1.125rem' }}>
          Want La Ligne du Marais before you buy?{' '}
          <a href="#subscribe">Return to the signup form.</a>
        </p>
      </div>
    </div>
  );
}
