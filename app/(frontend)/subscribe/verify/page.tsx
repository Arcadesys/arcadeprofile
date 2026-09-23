import type { Metadata } from 'next';
import VerificationClient from './VerificationClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Confirm writing preferences',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function VerifySignupPage() {
  return <div className={styles.shell}><VerificationClient /></div>;
}
