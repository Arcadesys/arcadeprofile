import type { Metadata } from 'next';
import Image from 'next/image';
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

          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>A monthly column by Austen Tucker</p>
              <h1>Queer Columns<span>.</span></h1>
              <p className={styles.dek}>
                Trans life, queer history, and the policies that shape what happens next.
                Personal stakes, public evidence, and room for the people living with the answer.
              </p>
              <p className={styles.motto}>Let people be people.</p>
            </div>
            <figure className={styles.heroPortrait}>
              <Image
                src="/images/headshots/austen-tucker-crowder.jpeg"
                alt="Austen Tucker smiling in glasses."
                width={768}
                height={1024}
                sizes="(max-width: 720px) 192px, 272px"
                priority
              />
            </figure>
          </header>

          <section className={styles.issues} aria-labelledby="issues-title">
            <div className={styles.sectionHeading}>
              <h2 id="issues-title">{issues.length ? 'Latest issues' : 'The first issue is on the desk'}</h2>
            </div>

            {issues.length ? (
              <ol className={styles.issueList}>
                {issues.map((issue, index) => (
                  <li key={issue.slug}>
                    <article className={issue.hero ? `${styles.issueCard} ${styles.illustratedIssue}` : styles.issueCard}>
                      <Link className={styles.issueCardLink} href={buildPostUrl('queer-columns', issue.slug)}>
                        {issue.hero && (
                          <figure className={styles.issueArt}>
                            <Image
                              src={issue.hero.src}
                              alt={issue.hero.alt}
                              width={1536}
                              height={1024}
                              sizes="(max-width: 720px) 100vw, 34rem"
                            />
                            {issue.slug === 'the-safe-door' && <figcaption>Illustration for The Safe Door</figcaption>}
                          </figure>
                        )}
                        <div className={styles.issueCopy}>
                          <div className={styles.issueMeta}>
                            <span>Issue {String(issues.length - index).padStart(2, '0')}</span>
                            <time dateTime={issue.date}>{formatSiteDate(issue.date)}</time>
                          </div>
                          <h3>{issue.title}</h3>
                          {issue.excerpt && <p>{issue.excerpt}</p>}
                          <span className={styles.readIssue}>Read issue <span aria-hidden="true">→</span></span>
                        </div>
                      </Link>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <article className={styles.firstIssue}>
                <figure className={styles.issueArt}>
                  <Image
                    src="/images/queer-columns/safe-door-editorial.png"
                    alt="Illustration of a half-open door with bright paths leading toward it."
                    width={1536}
                    height={1024}
                    sizes="(max-width: 720px) 100vw, 34rem"
                  />
                  <figcaption>Illustration for The Safe Door</figcaption>
                </figure>
                <div className={styles.issueCopy}>
                  <div className={styles.issueMeta}><span>Issue 01</span><span>In progress</span></div>
                  <h3>The Safe Door</h3>
                  <p>What happens when a community&apos;s needs become difficult enough to meet? The needs don&apos;t disappear. They go underground.</p>
                </div>
              </article>
            )}
          </section>

          <section className={styles.signup} aria-labelledby="signup-title">
            <div>
              <h2 id="signup-title">Get the next column</h2>
              <p>One essay a month. This list is separate from Fiction, Essays, Lab, and All Writing.</p>
            </div>
            <a className={styles.signupLink} href={signupUrl}>Subscribe to Queer Columns <span aria-hidden="true">↗</span></a>
          </section>

          <aside className={styles.archive} aria-labelledby="archive-title">
            <figure className={styles.archiveArt}>
              <Image
                src="/images/queer-columns/pride-essays-zines.png"
                alt="Illustration of five colorful essay zines spread across a desk."
                width={1672}
                height={941}
                sizes="(max-width: 720px) 100vw, 72rem"
              />
              <figcaption>Illustration for the Pride Essays shelf</figcaption>
            </figure>
            <div>
              <h2 id="archive-title">Earlier queer writing</h2>
              <p>The five-part Pride Essays series is its own story, and a good place to keep reading.</p>
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
