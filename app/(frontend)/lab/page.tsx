import type { Metadata } from 'next';
import Link from 'next/link';

import { LAB_PROJECTS } from '@/data/lab-projects';
import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';
import { SITE_URL } from '@/lib/site-url';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';

import { LabProjectVisual } from './LabProjectVisual';
import styles from './lab.module.css';

const DESCRIPTION =
  'Accessible case studies about public products and Lab infrastructure built by Austen Tucker: WizWor, ToonTok, ArcadeProfile, and Conductor.';

export const metadata: Metadata = {
  title: 'Case Studies',
  description: DESCRIPTION,
  alternates: { canonical: '/lab' },
  openGraph: {
    type: 'website',
    title: `Case Studies | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: '/lab',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary',
    title: `Case Studies | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

export default function LabPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Case Studies',
    description: DESCRIPTION,
    url: `${SITE_URL}/lab`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: LAB_PROJECTS.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/lab/${project.slug}`,
        name: project.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className={styles.page}>
        <header className={styles.indexHeader}>
          <p className={styles.eyebrow}>AI engineering case studies</p>
          <h1>Case Studies</h1>
          <p className={styles.lede}>
            Real products, the systems behind them, and the lessons earned while building them.
            Each case study explains the work before offering a link to the public product.
          </p>
        </header>

        <ol className={styles.projectList}>
          {LAB_PROJECTS.map((project, index) => (
            <li key={project.slug}>
              <article className={styles.projectCard}>
                <LabProjectVisual project={project} />

                <div className={styles.projectBody}>
                  <p className={styles.projectNumber}>
                    Project {String(index + 1).padStart(2, '0')} · {project.status}
                  </p>
                  <h2>
                    <Link href={`/lab/${project.slug}`}>{project.title}</Link>
                  </h2>
                  <p>{project.summary}</p>
                  <ul className={styles.tags} aria-label={`${project.title} disciplines`}>
                    {project.disciplines.map((discipline) => (
                      <li key={discipline}>{discipline}</li>
                    ))}
                  </ul>
                  <Link className={styles.caseLink} href={`/lab/${project.slug}`}>
                    Read the case study <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
