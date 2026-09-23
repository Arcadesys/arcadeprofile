import type { Metadata } from 'next';
import Link from 'next/link';

import { getGroupBySlug, buildPostUrl } from '@/lib/blog';
import { formatSiteDate } from '@/lib/site-time';
import { SITE_NAME } from '@/lib/site-brand';
import { SITE_URL } from '@/lib/site-url';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { JsonLd } from '@/lib/structured-data';

import styles from './queercolumns.module.css';

export const dynamic = 'force-dynamic';

const description = 'Queer Columns is a monthly column by Austen Tucker on trans life, queer history, and the policies that shape our lives. Let people be people.';
const signupUrl = 'https://austen-tucker.kit.com/e422068d6d?utm_source=thearcades.me&utm_medium=site&utm_campaign=queer_columns';

export const metadata: Metadata = {
  title: 'Queer Columns',
  description,
  alternates: { canonical: '/queercolumns' },
  openGraph: { type: 'website', title: `Queer Columns | ${SITE_NAME}`, description, url: '/queercolumns', images: [DEFAULT_SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: `Queer Columns | ${SITE_NAME}`, description, images: [DEFAULT_SOCIAL_IMAGE.url] },
};

export default async function QueerColumnsPage() {
  const [column, pride] = await Promise.all([
    getGroupBySlug('queer-columns'),
    getGroupBySlug('pride-essays'),
  ]);
  const issues = column?.posts.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date)) ?? [];
  const priorReads = pride?.posts.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3) ?? [];

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Queer Columns',
        description,
        url: `${SITE_URL}/queercolumns`,
        author: { '@id': `${SITE_URL}/#person` },
        isPartOf: { '@id': `${SITE_URL}/#website` },
      }} />
      <main className={styles.page}>
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/writing">Writing</Link><span aria-hidden="true">/</span><span>Queer Columns</span>
          </nav>

          <header className={styles.masthead}>
            <div className={styles.mastheadTop}>
              <p>The Arcades&apos; Lab <span aria-hidden="true">/</span> A monthly column</p>
              <p>By Austen Tucker</p>
            </div>
            <div className={styles.flagRule} aria-hidden="true" />
            <h1><span>Queer</span><span>Columns<span className={styles.titleDot}>.</span></span></h1>
            <div className={styles.mastheadBottom}>
              <p>Trans life. Queer history. The policies that shape what happens next.</p>
              <span className={styles.monthlyLabel}>One essay each month</span>
            </div>
          </header>

          <section className={styles.motto} aria-labelledby="motto-title">
            <div className={styles.mottoMark} aria-hidden="true">“</div>
            <div>
              <p className={styles.sectionLabel}>The motto</p>
              <h2 id="motto-title">Let people be people<span>.</span></h2>
              <p>Personal stakes, public evidence, and room for the lives behind the argument. Each issue follows one question far enough to find the people living with the answer.</p>
            </div>
          </section>

          <section className={styles.issues} aria-labelledby="issues-title">
            <div className={styles.sectionHeading}>
              <p className={styles.sectionLabel}>The column</p>
              <h2 id="issues-title">{issues.length ? 'Read the issues' : 'The first issue is on the desk'}</h2>
              <p>Monthly essays, with sources and side conversations when the story needs them.</p>
            </div>

            {issues.length ? (
              <ol className={styles.issueList}>
                {issues.map((issue, index) => (
                  <li key={issue.slug}>
                    <article className={styles.issueCard}>
                      <div className={styles.issueMeta}><span>Issue {String(issues.length - index).padStart(2, '0')}</span><time dateTime={issue.date}>{formatSiteDate(issue.date)}</time></div>
                      <h3><Link href={buildPostUrl('queer-columns', issue.slug)}>{issue.title}</Link></h3>
                      {issue.excerpt && <p>{issue.excerpt}</p>}
                      <Link className={styles.readLink} href={buildPostUrl('queer-columns', issue.slug)}>Read this issue <span aria-hidden="true">↗</span></Link>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <article className={styles.firstIssue}>
                <div className={styles.issueMeta}><span>Issue 01</span><span>In progress</span></div>
                <h3>The Safe Door</h3>
                <p>What happens when a community&apos;s needs become difficult enough to meet? The needs don&apos;t disappear. They go underground.</p>
                <span className={styles.inProgress}>Essay and source conversations in progress</span>
              </article>
            )}
          </section>

          <section className={styles.signup} aria-labelledby="signup-title">
            <div>
              <p className={styles.sectionLabel}>The monthly letter</p>
              <h2 id="signup-title">Get Queer Columns</h2>
              <p>One column each month, sent to a separate Queer Columns list in Kit. Signing up for it will not add you to Fiction, Essays, Lab, or All Writing.</p>
            </div>
            <a className={styles.signupLink} href={signupUrl}>Subscribe to Queer Columns <span aria-hidden="true">↗</span></a>
          </section>

          <aside className={styles.archive} aria-labelledby="archive-title">
            <div className={styles.archiveIntro}>
              <p className={styles.sectionLabel}>From the shelf</p>
              <h2 id="archive-title">The writing that came before</h2>
              <p>The five-part Pride Essays series is its own story. Start there while this column takes shape.</p>
              <Link href="/projects/pride-essays" className={styles.archiveLink}>Explore Pride Essays <span aria-hidden="true">→</span></Link>
            </div>
            {priorReads.length > 0 && (
              <ol className={styles.priorList}>
                {priorReads.map((post) => (
                  <li key={post.slug}>
                    <span>{formatSiteDate(post.date)}</span>
                    <Link href={buildPostUrl('pride-essays', post.slug)}>{post.title}</Link>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
