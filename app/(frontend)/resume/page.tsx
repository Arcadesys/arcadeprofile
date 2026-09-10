import type { Metadata } from 'next';
import Link from 'next/link';

import { PieceActions } from '@/app/components/PieceActions';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import {
  RESUME_ACCOMPLISHMENTS,
  RESUME_CANONICAL_PATH,
  RESUME_DESCRIPTION,
  RESUME_EARLIER,
  RESUME_EDUCATION,
  RESUME_EXPERIENCE,
  RESUME_PDF_PATH,
  RESUME_PROFILE,
  RESUME_SKILLS,
  RESUME_SUMMARY,
} from '@/lib/resume';

import styles from './resume.module.css';

export const metadata: Metadata = {
  title: 'Resume',
  description: `Professional resume of ${RESUME_PROFILE.name} — builder, AI enablement leader, program manager, and accessibility-first facilitator.`,
  alternates: { canonical: RESUME_CANONICAL_PATH },
  openGraph: {
    type: 'profile',
    title: `Resume — ${RESUME_PROFILE.name}`,
    description: RESUME_DESCRIPTION,
    url: RESUME_CANONICAL_PATH,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Resume — ${RESUME_PROFILE.name}`,
    description: RESUME_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

export default function ResumePage() {
  return (
    <main className={styles.page}>

      <header className={styles.header}>
        <h1 className={`gaysparkles ${styles.name}`}>{RESUME_PROFILE.name}</h1>
        <p className={styles.titleLine}>{RESUME_PROFILE.titleLine}</p>
        <p className={styles.location}>{RESUME_PROFILE.location}</p>
        <div className={styles.contact}>
          <a href={`mailto:${RESUME_PROFILE.email}`}>{RESUME_PROFILE.email}</a>
          <a href={RESUME_PROFILE.siteUrl}>{RESUME_PROFILE.site}</a>
          <a href={RESUME_PROFILE.githubUrl}>{RESUME_PROFILE.github}</a>
        </div>
        <PieceActions
          title={`Resume — ${RESUME_PROFILE.name}`}
          readHref={RESUME_CANONICAL_PATH}
          pdfHref={RESUME_PDF_PATH}
          shareUrl={RESUME_CANONICAL_PATH}
          showRead={false}
        />
      </header>

      <section className={styles.section} aria-labelledby="resume-summary">
        <h2 id="resume-summary" className={styles.sectionHeading}>Summary</h2>
        <p className={styles.summary}>{RESUME_SUMMARY}</p>
      </section>

      <section className={styles.section} aria-labelledby="resume-accomplishments">
        <h2 id="resume-accomplishments" className={styles.sectionHeading}>Key Accomplishments</h2>
        <ul className={styles.accomplishments}>
          {RESUME_ACCOMPLISHMENTS.map((item) => (
            <li key={item.text}>
              {item.text}
              {item.proofHref ? (
                <Link className={styles.proofLink} href={item.proofHref}>See the work</Link>
              ) : null}
            </li>
          ))}
        </ul>
        <p className={styles.proofRow}>
          <span>See the work:</span>
          <Link href="/lab">Case studies</Link>
          <Link href="/projects">Projects</Link>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="resume-experience">
        <h2 id="resume-experience" className={styles.sectionHeading}>Experience</h2>
        {RESUME_EXPERIENCE.map((role) => (
          <article className={styles.card} key={role.company}>
            <h3 className={styles.jobCompany}>{role.company}</h3>
            <p className={styles.jobTitle}>{role.title}</p>
            <p className={styles.jobMeta}>{role.location} &middot; {role.dates}</p>
            <ul className={styles.jobBullets}>
              {role.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="resume-earlier">
        <h2 id="resume-earlier" className={styles.sectionHeading}>Earlier Experience</h2>
        <div className={styles.card}>
          <ul className={styles.lineList}>
            {RESUME_EARLIER.map((role) => (
              <li className={styles.line} key={role.org}>
                <strong>{role.org}</strong> — {role.role} ({role.dates})
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="resume-skills">
        <h2 id="resume-skills" className={styles.sectionHeading}>Tools &amp; Skills</h2>
        <div className={styles.card}>
          {RESUME_SKILLS.map((group) => (
            <p className={styles.skillGroup} key={group.label}>
              <strong>{group.label}:</strong> {group.skills}
            </p>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="resume-education">
        <h2 id="resume-education" className={styles.sectionHeading}>Education &amp; Certifications</h2>
        <div className={styles.card}>
          <ul className={styles.lineList}>
            {RESUME_EDUCATION.map((line) => <li className={styles.line} key={line}>{line}</li>)}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="resume-hire">
        <h2 id="resume-hire" className={styles.sectionHeading}>Work with me</h2>
        <div className={styles.hire}>
          <p className={styles.hireCopy}>
            I help engineering and product organizations make AI useful in everyday work —
            through working tools, clear goals, and learning experiences that leave people with
            something they built. If that&rsquo;s the problem on your desk, get in touch.
          </p>
          <div className={styles.hireActions}>
            <a className={styles.hirePrimary} href={`mailto:${RESUME_PROFILE.email}`}>
              Email me <span aria-hidden="true">→</span>
            </a>
            <Link className={styles.hireSecondary} href="/lab">Read the case studies</Link>
            <Link className={styles.hireSecondary} href="/projects">See what I build</Link>
          </div>
        </div>
      </section>

    </main>
  );
}
