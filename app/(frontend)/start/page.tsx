import type { Metadata } from 'next';

import { SITE_NAME } from '@/lib/site-brand';

import styles from './start.module.css';

export const metadata: Metadata = {
  title: 'Start here',
  description: 'A few clear ways into Austen Tucker’s work: AI and product leadership, furry and AI projects, and writing.',
  alternates: { canonical: '/start' },
};

const routes = [
  {
    id: 'work',
    title: 'Work',
    description: 'Essays and practical tools about work, change, and making the next step.',
    links: [
      { label: 'When in Crisis, Make Tea', href: 'https://work.thearcades.me/blog/when-in-crisis-make-tea', detail: 'A grounding place to begin.' },
      { label: 'Layoff triage', href: 'https://work.thearcades.me/layoff-triage', detail: 'A practical guide for a difficult moment.' },
      { label: 'Resume', href: 'https://work.thearcades.me/resume', detail: 'Professional background and experience.' },
    ],
  },
  {
    id: 'furry-ai',
    title: 'Furry and AI',
    description: 'Character art, furry community work, and playful experiments with AI.',
    links: [
      { label: 'MFF', href: 'https://www.thearcades.me/mff', detail: 'Midwest FurFest community work.' },
      { label: 'Why furry?', href: 'https://hack.thearcades.me/why', detail: 'A personal introduction to furry.' },
      { label: 'WizWor furry demo', href: 'https://wizwor.vercel.app/furry', detail: 'Try the furry character experience.' },
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Fiction, essays, and queer columns from The Arcades.',
    links: [
      { label: 'The Dream Space', href: 'https://www.thearcades.me/projects/on-writing/the-dream-space', detail: 'Writing about imagination and creative practice.' },
      { label: 'The Safe Door', href: 'https://www.thearcades.me/projects/queer-columns/the-safe-door', detail: 'A queer column on finding a way through.' },
      { label: 'Cultural Weather Vane', href: 'https://www.thearcades.me/lab/cultural-weather-vane', detail: 'An interactive cultural reading toy.' },
    ],
  },
] as const;

const introductions = [
  { label: 'When in Crisis, Make Tea', href: 'https://work.thearcades.me/blog/when-in-crisis-make-tea', detail: 'Start with a small, grounding practice.' },
  { label: 'The Dream Space', href: 'https://www.thearcades.me/projects/on-writing/the-dream-space', detail: 'Step into the writing and imagination side.' },
  { label: 'WizWor', href: 'https://wizwor.vercel.app/', detail: 'Meet the playful AI experiment.' },
] as const;

export default function StartPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p>{SITE_NAME}</p>
        <h1>So, what is all this?</h1>
        <p className={styles.intro}>A few doors into my work. Choose a subject, or start with one of these three pieces.</p>
      </header>

      <section className={styles.introductions} aria-labelledby="start-with-heading">
        <h2 id="start-with-heading">Start with one of these</h2>
        <ul>
          {introductions.map((item) => (
            <li key={item.href}>
              <a href={item.href}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
                <span className={styles.follow} aria-hidden="true">Read or explore →</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.routes}>
        {routes.map((route) => (
          <section className={styles.route} key={route.id} aria-labelledby={`route-${route.id}`}>
            <h2 id={`route-${route.id}`}>{route.title}</h2>
            <p>{route.description}</p>
            <ul>
              {route.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>
                    <strong>{link.label}</strong>
                    <span>{link.detail}</span>
                    <span className={styles.follow} aria-hidden="true">Open →</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
