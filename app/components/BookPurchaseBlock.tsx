import Image from 'next/image';
import Link from 'next/link';

import { bookPath, type BookInfo } from '@/data/books';
import BookActions from './BookActions';
import styles from './BookPurchaseBlock.module.css';

export default function BookPurchaseBlock({
  book,
  headingId,
  heading = book.title,
  headingAs = 'h2',
  variant = 'default',
  placement,
  pitch,
}: {
  book: BookInfo;
  headingId: string;
  heading?: string;
  headingAs?: 'h1' | 'h2';
  variant?: 'default' | 'hero';
  placement?: string;
  pitch?: string;
}) {
  const Heading = headingAs;
  const readAction = book.actions.find((action) => action.kind === 'read');
  return (
    <aside className={`${styles.block} ${variant === 'hero' ? styles.hero : ''}`} aria-labelledby={headingId}>
      {book.coverImage ? (
        <Image className={styles.cover} src={book.coverImage} alt={book.coverAlt ?? `Cover of ${book.title}.`} width={600} height={900} sizes={variant === 'hero' ? '(max-width: 560px) 118px, (max-width: 900px) 150px, 250px' : '140px'} priority={variant === 'hero'} />
      ) : null}
      <div className={styles.body}>
        <Heading id={headingId}><Link href={bookPath(book)}>{heading}</Link></Heading>
        {pitch ? <p className={styles.pitch}>{pitch}</p> : null}
        <p className={styles.exclusive}>Eight stories, including <em>Foxtails</em> — only in the book.</p>
        <BookActions book={book} purchaseOnly placement={placement} />
        {readAction ? <Link className={styles.readFree} href={readAction.href}>{readAction.label}</Link> : null}
      </div>
    </aside>
  );
}
