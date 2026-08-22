import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PieceActions } from '@/app/components/PieceActions';
import { requireLabProject } from '@/data/lab-projects';
import { buildEditorialMetadata } from '@/lib/editorial-metadata';
import { requireLabCaseStudy, loadLabCaseStudies } from '@/lib/lab-case-studies';
import { markdownToSafeHtml } from '@/lib/markdown-render';
import { JsonLd } from '@/lib/structured-data';

import { LabProjectLinks } from '../LabProjectLinks';
import { LabProjectVisual } from '../LabProjectVisual';
import styles from '../lab.module.css';

type Props = { params: Promise<{ slug: string }> };

function getCaseStudy(slug: string) {
  try {
    return requireLabCaseStudy(slug);
  } catch {
    notFound();
  }
}

export function generateStaticParams() {
  return loadLabCaseStudies().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  const project = requireLabProject(study.slug);
  return buildEditorialMetadata({
    title: `${study.title} | The Arcades Lab`,
    description: study.description,
    path: `/lab/${study.slug}`,
    image: project.screenshot?.src,
    section: 'The Arcades Lab',
    collection: { name: 'The Arcades Lab', path: '/lab' },
    pdfPath: `/lab/${study.slug}/pdf`,
  }).metadata;
}

export default async function LabCaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  const project = requireLabProject(study.slug);
  const editorialMetadata = buildEditorialMetadata({
    title: study.title,
    description: study.description,
    path: `/lab/${study.slug}`,
    image: project.screenshot?.src,
    section: 'The Arcades Lab',
    collection: { name: 'The Arcades Lab', path: '/lab' },
    pdfPath: `/lab/${study.slug}/pdf`,
  });

  return (
    <>
      <JsonLd data={editorialMetadata.articleJsonLd} />
      <JsonLd data={editorialMetadata.breadcrumbJsonLd} />
      <main className={styles.page}>
        <article>
          <nav aria-label="The Arcades Lab">
            <Link className={styles.backLink} href="/lab">
              <span aria-hidden="true">←</span> All Lab projects
            </Link>
          </nav>

          <header className={styles.caseHeader}>
            <p className={styles.eyebrow}>The Arcades Lab · Case study {String(study.number).padStart(2, '0')}</p>
            <p className={styles.status}>{project.status}</p>
            <h1>{study.title}</h1>
            <p className={styles.lede}>{study.lede}</p>
          </header>

          <LabProjectVisual project={project} hero priority />

          <div className={styles.story} dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(study.body) }} />

          <div className={styles.pieceActions}>
            <PieceActions
              title={study.title}
              readHref={`/lab/${study.slug}`}
              pdfHref={`/lab/${study.slug}/pdf`}
              shareUrl={editorialMetadata.canonicalUrl}
            />
          </div>

          <div className={styles.story}>
            <LabProjectLinks project={project} description={study.exploreDescription} />
          </div>
        </article>
      </main>
    </>
  );
}
