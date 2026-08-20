import type { Metadata } from 'next';
import Link from 'next/link';

import { requireLabProject } from '@/data/lab-projects';
import { JsonLd } from '@/lib/structured-data';

import { LabProjectLinks } from '../LabProjectLinks';
import { LabProjectVisual } from '../LabProjectVisual';
import styles from '../lab.module.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.thearcades.me').replace(/\/+$/, '');
const project = requireLabProject('arcadeprofile');
const DESCRIPTION =
  'How Austen Tucker built ArcadeProfile as a public publishing product, including its accessible reading surface, CMS, scheduled delivery pipeline, and operational lessons.';

export const metadata: Metadata = {
  title: 'ArcadeProfile | The Arcades Lab',
  description: DESCRIPTION,
  alternates: { canonical: '/lab/arcadeprofile' },
  openGraph: {
    type: 'article',
    title: 'ArcadeProfile | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
    url: '/lab/arcadeprofile',
  },
  twitter: {
    card: 'summary',
    title: 'ArcadeProfile | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
  },
};

export default function ArcadeProfileCaseStudyPage() {
  const pageUrl = `${SITE_URL}/lab/${project.slug}`;
  const caseStudyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'ArcadeProfile',
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
      { name: 'ArcadeProfile', item: pageUrl },
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
            <p className={styles.eyebrow}>The Arcades Lab · Case study 03</p>
            <p className={styles.status}>{project.status}</p>
            <h1>ArcadeProfile</h1>
            <p className={styles.lede}>
              The public publishing and product platform behind The Arcades: web-first stories,
              projects, subscriptions, and the operational system that keeps them moving.
            </p>
          </header>

          <LabProjectVisual project={project} hero priority />

          <div className={styles.story}>
            <section aria-labelledby="why-build-it">
              <h2 id="why-build-it">Why I built it</h2>
              <p>
                I needed more than a portfolio page. Fiction, essays, product work, subscriptions,
                and serialized releases all have different shapes, but visitors should encounter one
                coherent, readable public site.
              </p>
              <p>
                ArcadeProfile is that product and its publishing machinery. It gives readers full
                semantic web pages while giving me a content model, scheduling queue, delivery
                records, and authoring tools behind the public surface.
              </p>
            </section>

            <section aria-labelledby="build-snapshot">
              <h2 id="build-snapshot">Build snapshot</h2>
              <dl className={styles.snapshot}>
                <div>
                  <dt>Public product</dt>
                  <dd>Next.js and React pages for stories, projects, products, feeds, and subscriptions</dd>
                </div>
                <div>
                  <dt>Content platform</dt>
                  <dd>Payload CMS, PostgreSQL, structured collections, previews, and media storage</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>ActiveCampaign audience state with Postmark transactional and newsletter delivery</dd>
                </div>
                <div>
                  <dt>Operations</dt>
                  <dd>Scheduled publishing, delivery audit records, scoped MCP tools, and path revalidation</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="what-i-did">
              <h2 id="what-i-did">What I did</h2>

              <h3>I made the web page the primary publication</h3>
              <p>
                Stories and essays render as semantic HTML with real headings, navigation, reading
                order, and RSS discovery. Reading controls change type, contrast, line height, and
                measure without turning the work into a separate document-only experience.
              </p>

              <h3>I built publishing as a stateful workflow</h3>
              <p>
                A post moves through draft, scheduled, published, and newsletter-sent states. A
                scheduled job promotes due work, resolves its audience, sends through Postmark, and
                records the attempt before the item is considered sent. Validation blocks impossible
                dates and the delivery trail distinguishes acceptance from confirmed delivery.
              </p>

              <h3>I separated audience ownership from mail delivery</h3>
              <p>
                ActiveCampaign owns contacts, consent, subscription lists, and segmentation. Postmark
                owns messages that leave the application. Keeping those responsibilities explicit
                avoids two systems quietly competing to define what “subscribed” or “sent” means.
              </p>

              <h3>I added bounded authoring interfaces</h3>
              <p>
                The Payload admin supports structured editing and previews. The same content system
                exposes scoped MCP tools over local and HTTP transports, with separate read and write
                credentials. New tools share one implementation instead of drifting between entry
                points.
              </p>
            </section>

            <section aria-labelledby="what-i-learned">
              <h2 id="what-i-learned">What I learned</h2>

              <h3>Publishing is a state machine</h3>
              <p>
                A date field and a cron job are not enough. Publication, audience resolution,
                delivery acceptance, confirmation, retry safety, and rollback each need a recorded
                state. The model became clearer once those transitions were named.
              </p>

              <h3>“Sent” needs evidence</h3>
              <p>
                An API accepting a batch does not prove that messages reached recipients. Message
                identifiers, webhook events, delivery counts, and reconciliation make the claim
                inspectable without pretending that every downstream outcome is known immediately.
              </p>

              <h3>Accessibility belongs in the platform</h3>
              <p>
                Large text and contrast are baseline requirements, not a theme. Reading preferences,
                semantic structure, keyboard behavior, admin usability, and full web text all have to
                survive new content types and new features.
              </p>

              <h3>Public proof and operational proof are different</h3>
              <p>
                A source build can pass while a database migration, authenticated preview, scheduled
                job, or delivery integration still needs environment-specific verification. I learned
                to report each evidence layer separately instead of collapsing them into “it works.”
              </p>
            </section>

            <section className={styles.callout} aria-labelledby="current-best">
              <h2 id="current-best">Current best</h2>
              <p>
                ArcadeProfile is both the public artifact and the product that ships the artifacts.
                Its current strength is the connection between an accessible reading experience and
                a publishing system with explicit content, audience, delivery, and audit boundaries.
              </p>
            </section>

            <section className={styles.limits} aria-labelledby="limits">
              <h2 id="limits">Limits and open questions</h2>
              <ul>
                <li>There are no public audience-growth or revenue figures to claim in this case study.</li>
                <li>Database, email, and authenticated-admin behavior require environment-specific verification in addition to a source build.</li>
                <li>The public site can fall back gracefully when CMS data is unavailable, but that is not proof that every connected service is healthy.</li>
                <li>A publication-ready screenshot of the public reading or projects surface still needs to be captured.</li>
              </ul>
            </section>

            <LabProjectLinks
              project={project}
              description="You have reached the public product link after the case study. It opens the same publishing platform described above."
            />
          </div>
        </article>
      </main>
    </>
  );
}
