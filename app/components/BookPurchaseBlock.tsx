import Image from 'next/image';
import Link from 'next/link';

import { bookPath, type BookInfo } from '@/data/books';
import BookActions from './BookActions';
import styles from './BookPurchaseBlock.module.css';

export default function BookPurchaseBlock({ book, headingId, heading = book.title }: { book: BookInfo; headingId: string; heading?: string }) {
  return (
    <aside className={styles.block} aria-labelledby={headingId}>
      {book.coverImage ? (
        <Image className={styles.cover} src={book.coverImage} alt={book.coverAlt ?? `Cover of ${book.title}.`} width={600} height={900} sizes="140px" />
      ) : null}
      <div className={styles.body}>
        <h2 id={headingId}><Link href={bookPath(book)}>{heading}</Link></h2>
        <p>Eight stories, including <em>Foxtails</em>, which is only in the book. Read seven free here; get all eight in the collection.</p>
        <BookActions book={book} purchaseOnly />
      </div>
    </aside>
  );
}
