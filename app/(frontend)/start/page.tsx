import Link from 'next/link';
import type { Metadata } from 'next';

import { SITE_NAME } from '@/lib/site-brand';

import styles from './start.module.css';

export const metadata: Metadata = {
  title: 'Start here',
  description: 'Choose a place to begin: speculative fiction, essays and columns, or professional work.',
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
      { label: 'Shoot ’em Up', href: 'https://www.thearcades.me/toys/shoot-em-up', detail: 'Play an interactive-fiction argument about games and tea.' },
      { label: 'The Day I Split in Two', href: 'https://www.thearcades.me/toys/the-day-i-split-in-two', detail: 'An interactive memoir about change and rebuilding.' },
      { label: 'Cultural Weather Vane', href: 'https://www.thearcades.me/toys/cultural-weather-vane', detail: 'Explore songs and headlines on a shared map.' },
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Fiction, essays, and queer columns from The Arcades.',
    links: [
      { label: 'This Is What I Do for Fun', href: 'https://www.thearcades.me/this-is-what-i-do-for-fun', detail: 'A collection of short stories.' },
      { label: "Estelle's Children", href: 'https://www.thearcades.me/novels/estelles-children', detail: 'A preview of a novel told as an archive.' },
      { label: 'It Takes a Zoo', href: 'https://www.thearcades.me/novels/it-takes-a-zoo', detail: 'Read a novel in stories about found family and survival.' },
    ],
  },
] as const;

const entryChoices = [
  { label: 'Read fiction', title: 'Cold Boot', href: '/novels/it-takes-a-zoo/cold-boot', detail: 'Start It Takes a Zoo, a novel in stories about found family and survival.', action: 'Read Cold Boot' },
  { label: 'Read essays and columns', title: 'The Safe Door', href: '/projects/queer-columns/the-safe-door', detail: 'Begin with a Queer Columns essay about safety, community, and building another map.', action: 'Read The Safe Door' },
  { label: 'Explore professional work', title: 'The Arcades Work', href: 'https://work.thearcades.me/?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=start_entry', detail: 'See professional projects, case studies, and writing.', action: 'Visit the work site' },
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
        <h2 id="start-with-heading">Choose a place to begin</h2>
        <ul>
          {entryChoices.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span className={styles.choiceLabel}>{item.label}</span>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <span className={styles.follow}>{item.action} <span aria-hidden="true">{item.href.startsWith('http') ? '↗' : '→'}</span></span>
              </Link>
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
