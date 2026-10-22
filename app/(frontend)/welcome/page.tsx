import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-brand';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { WORK_RESUME_URL } from '@/lib/work-resume';

import styles from '../start/start.module.css';

const description = 'Meet Austen Tucker: builder, leader, and writer. Explore professional work, books, stories, and ways to get in touch.';

export const metadata: Metadata = {
  title: 'Welcome · Austen Tucker',
  description,
  alternates: { canonical: '/welcome' },
  openGraph: {
    type: 'website',
    title: `Welcome · Austen Tucker | ${SITE_NAME}`,
    description,
    url: '/welcome',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Welcome · Austen Tucker',
    description,
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

// Keep this stable QR destination; the selections can change without reprinting cards.
const introductions = [
  {
    label: 'Work together',
    title: 'Builder & leader',
    href: 'https://work.thearcades.me/',
    detail: 'AI enablement, transformation, and practical tools. Explore my professional work.',
    action: 'Work with me',
  },
  {
    label: 'Find your next read',
    title: 'Books & stories',
    href: '/books',
    detail: 'Current books, upcoming releases, and the backlist, with links to buy and read.',
    action: 'Explore the books',
  },
  {
    label: 'Keep in touch',
    title: 'Say hello',
    href: 'mailto:austen.crowder@gmail.com',
    detail: 'Continue the conversation. Send me a note.',
    action: 'Email Austen',
  },
] as const;

export default function WelcomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p>{SITE_NAME}</p>
        <h1>Austen Tucker</h1>
        <p className={styles.intro}>Builder · Leader · Writer</p>
        <p className={styles.intro}>Welcome. If you found your way here from my card, here’s a place to pick up the conversation.</p>
      </header>

      <section className={styles.introductions} aria-labelledby="welcome-next-heading">
        <h2 id="welcome-next-heading">Where would you like to go?</h2>
        <ul>
          {introductions.map((item) => (
            <li key={item.href}>
              <a href={item.href}>
                <span className={styles.choiceLabel}>{item.label}</span>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <span className={styles.follow}>{item.action} <span aria-hidden="true">→</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.route} aria-labelledby="welcome-more-heading">
        <h2 id="welcome-more-heading">A little more about me</h2>
        <ul>
          <li><Link href={WORK_RESUME_URL}><strong>Résumé</strong><span>Professional experience and selected work.</span></Link></li>
          <li><Link href="/writing"><strong>Read something</strong><span>Fiction, essays, and places to begin.</span></Link></li>
          <li><Link href="/bio"><strong>About Austen</strong><span>The person behind the work.</span></Link></li>
        </ul>
      </section>
    </main>
  );
}
