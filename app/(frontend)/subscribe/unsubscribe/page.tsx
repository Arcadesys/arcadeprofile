import type { Metadata } from 'next';
import UnsubscribeClient from './UnsubscribeClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Unsubscribe from writing emails',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function WritingUnsubscribePage() {
  return <div className={styles.shell}><UnsubscribeClient /></div>;
}
