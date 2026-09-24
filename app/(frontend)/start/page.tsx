import type { Metadata } from 'next';

import { SITE_NAME } from '@/lib/site-brand';

import styles from './start.module.css';

export const metadata: Metadata = {
  title: 'Start here',
  description: 'A few clear ways into Austen Tucker’s work: professional writing, projects to explore, and creative writing.',
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
    id: 'demos-projects',
    title: 'Demos and Projects',
    description: 'Interactive toys, small experiments, and other projects you can explore.',
    links: [
      { label: 'Cultural Weather Vane', href: 'https://www.thearcades.me/toys/cultural-weather-vane', detail: 'Explore songs and headlines on a shared map.' },
      { label: 'The Day I Split in Two', href: 'https://www.thearcades.me/toys/the-day-i-split-in-two', detail: 'An interactive memoir about change and rebuilding.' },
      { label: 'It Takes a Zoo', href: 'https://www.thearcades.me/novels/it-takes-a-zoo', detail: 'Read a novel in stories about found family and survival.' },
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
        <h1>I’m a writer.</h1>
        <p className={styles.intro}>I mean compulsion, not hobby: the books are evidence. Everything else here is what happens when I can’t leave an idea alone.</p>
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
