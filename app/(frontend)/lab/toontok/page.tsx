import type { Metadata } from 'next';
import Link from 'next/link';

import { requireLabProject } from '@/data/lab-projects';
import { JsonLd } from '@/lib/structured-data';

import { LabProjectLinks } from '../LabProjectLinks';
import { LabProjectVisual } from '../LabProjectVisual';
import styles from '../lab.module.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.thearcades.me').replace(/\/+$/, '');
const project = requireLabProject('toontok');
const DESCRIPTION =
  'How Austen Tucker built ToonTok, a private-by-default character and image studio, and what it taught about canon, authority, privacy, accessibility, and AI cost boundaries.';

export const metadata: Metadata = {
  title: 'ToonTok | The Arcades Lab',
  description: DESCRIPTION,
  alternates: { canonical: '/lab/toontok' },
  openGraph: {
    type: 'article',
    title: 'ToonTok | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
    url: '/lab/toontok',
  },
  twitter: {
    card: 'summary',
    title: 'ToonTok | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
  },
};

export default function ToonTokCaseStudyPage() {
  const pageUrl = `${SITE_URL}/lab/${project.slug}`;
  const caseStudyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'ToonTok',
    description: DESCRIPTION,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    url: pageUrl,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'The Arcades Lab',
      url: `${SITE_URL}/lab`,
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: 'The Arcades Lab', item: `${SITE_URL}/lab` },
      { name: 'ToonTok', item: pageUrl },
    ].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...item,
    })),
  };

  return (
    <>
      <JsonLd data={caseStudyJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <main className={styles.page}>
        <article>
          <nav aria-label="The Arcades Lab">
            <Link className={styles.backLink} href="/lab">
              <span aria-hidden="true">←</span> All Lab projects
            </Link>
          </nav>

          <header className={styles.caseHeader}>
            <p className={styles.eyebrow}>The Arcades Lab · Case study 02</p>
            <p className={styles.status}>{project.status}</p>
            <h1>ToonTok</h1>
            <p className={styles.lede}>
              A private-by-default character and image studio built to keep identity, consent,
              and creative control around AI-assisted artwork.
            </p>
          </header>

          <LabProjectVisual project={project} hero priority />

          <div className={styles.story}>
            <section aria-labelledby="why-build-it">
              <h2 id="why-build-it">Why I built it</h2>
              <p>
                A one-off prompt can make an attractive picture while losing the character. I
                wanted a product where references, approved canon, style choices, and new artwork
                remain distinct—and where the person using the studio controls what becomes
                authoritative.
              </p>
              <p>
                ToonTok turns that problem into a repeatable workflow. Its public showroom explains
                the product, while invitation-based accounts protect access to private characters,
                source images, and generation tools.
              </p>
            </section>

            <section aria-labelledby="build-snapshot">
              <h2 id="build-snapshot">Build snapshot</h2>
              <dl className={styles.snapshot}>
                <div>
                  <dt>Product surface</dt>
                  <dd>Public showroom plus private Vault, Light Table, guides, and transform flows</dd>
                </div>
                <div>
                  <dt>Character system</dt>
                  <dd>Reusable profiles, references, approved model sheets, and versioned canon</dd>
                </div>
                <div>
                  <dt>AI boundary</dt>
                  <dd>Server-side image provider, durable jobs, credits, and cost confirmation</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>High-contrast interface, large controls, keyboard paths, and 200% zoom support</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="what-i-did">
              <h2 id="what-i-did">What I did</h2>

              <h3>I modeled character identity separately from output</h3>
              <p>
                Character profiles, reference images, guides, approved model sheets, and generated
                work have different jobs. ToonTok stores those distinctions instead of flattening
                everything into one prompt or gallery. A new image can be useful without silently
                becoming canon.
              </p>

              <h3>I made privacy part of the data model</h3>
              <p>
                Private assets are owner-scoped and stored behind authenticated access. Transform
                workflows record consent receipts and source hashes. The provider key stays on the
                server. These are product boundaries, not promises left to interface copy.
              </p>

              <h3>I built review and repair into the workflow</h3>
              <p>
                The Light Table gives people a place to inspect work, compare references, accept an
                image, or request a localized repair. Repair lineage remains attached to the work so
                a correction does not erase how the result was made.
              </p>

              <h3>I made cost visible before the expensive action</h3>
              <p>
                Generation, editing, and repair can call paid AI services. ToonTok tracks credits
                and carries an explicit cost-confirmation field through chargeable operations. The
                useful lesson was not merely to show a price: confirmation has to be part of the
                server-validated command.
              </p>
            </section>

            <section aria-labelledby="what-i-learned">
              <h2 id="what-i-learned">What I learned</h2>

              <h3>Creative AI needs an authority model</h3>
              <p>
                The most important question is not whether a model can generate another image. It is
                who can approve references, change canon, replace a model sheet, or authorize a
                repair. Explicit roles and version history make those decisions inspectable.
              </p>

              <h3>Privacy changes architecture</h3>
              <p>
                “Private by default” affects storage, routes, ownership checks, logs, and what can
                appear in a public demo. It cannot be added at the end as a hidden gallery setting.
              </p>

              <h3>Human acceptance is part of the system</h3>
              <p>
                A completed provider request is not an approved creative result. ToonTok separates
                generation from review and canonization so the human decision remains visible.
              </p>

              <h3>Accessibility must survive the real workflow</h3>
              <p>
                Large controls and contrast matter, but so do focus order, readable status language,
                resumable intake, and alternatives to image detail. The product has to remain usable
                while choosing references, comparing work, and confirming a consequential action.
              </p>
            </section>

            <section className={styles.callout} aria-labelledby="current-best">
              <h2 id="current-best">Current best</h2>
              <p>
                ToonTok’s strongest product idea is that character continuity is a managed creative
                asset. The system gives references, consent, canon, cost, generation, and human
                approval separate places in one end-to-end workflow.
              </p>
            </section>

            <section className={styles.limits} aria-labelledby="limits">
              <h2 id="limits">Limits and open questions</h2>
              <ul>
                <li>Account creation is invitation-based; the public showroom does not expose private studio data.</li>
                <li>There are no public adoption, reliability, or business-impact numbers to claim here.</li>
                <li>AI operations depend on configured providers and can consume credits or paid model resources.</li>
                <li>A publication-ready, permission-safe product screenshot still needs to be captured.</li>
              </ul>
            </section>

            <LabProjectLinks
              project={project}
              description="You have reached the public product link after the case study. The showroom explains ToonTok without exposing private account content."
            />
          </div>
        </article>
      </main>
    </>
  );
}
