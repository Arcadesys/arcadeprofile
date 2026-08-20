import type { Metadata } from 'next';
import Link from 'next/link';

import { requireLabProject } from '@/data/lab-projects';
import { JsonLd } from '@/lib/structured-data';

import { LabProjectLinks } from '../LabProjectLinks';
import { LabProjectVisual } from '../LabProjectVisual';
import styles from '../lab.module.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.thearcades.me').replace(/\/+$/, '');

const project = requireLabProject('wizwor');

const DESCRIPTION =
  'How Austen Tucker built WizWor, an agent-guided classic-game recommender, and what it taught about context engineering, tool contracts, orchestration, and evals.';

export const metadata: Metadata = {
  title: 'WizWor | The Arcades Lab',
  description: DESCRIPTION,
  alternates: { canonical: '/lab/wizwor' },
  openGraph: {
    type: 'article',
    title: 'WizWor | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
    url: '/lab/wizwor',
  },
  twitter: {
    card: 'summary',
    title: 'WizWor | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
  },
};

export default function WizWorCaseStudyPage() {
  const pageUrl = `${SITE_URL}/lab/${project.slug}`;
  const caseStudyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'WizWor',
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
      { name: 'WizWor', item: pageUrl },
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
            <p className={styles.eyebrow}>The Arcades Lab · Case study 01</p>
            <p className={styles.status}>{project.status}</p>
            <h1>WizWor</h1>
            <p className={styles.lede}>
              An agent-guided classic-game recommender built to find the useful boundary
              between language-model judgment and deterministic software.
            </p>
          </header>

          <LabProjectVisual project={project} hero priority />

          <div className={styles.story}>
            <section aria-labelledby="why-build-it">
              <h2 id="why-build-it">Why I built it</h2>
              <p>
                I wanted to learn what it takes to make an agent feel like part of a product,
                not a chat box pasted onto one. WizWor interviews a player in an original
                arcade-terminal voice, learns what kind of game they want, and reveals a small
                set of matches from a real catalog.
              </p>
              <p>
                OpenAI later released a product experience that handled part of this discovery
                problem better. That does not make WizWor disposable. It was a serious learning
                project: I built the system, found its failure modes, and turned those failures
                into engineering practices I can reuse.
              </p>
            </section>

            <section aria-labelledby="build-snapshot">
              <h2 id="build-snapshot">Build snapshot</h2>
              <dl className={styles.snapshot}>
                <div>
                  <dt>Interface</dt>
                  <dd>Next.js, React, TypeScript, keyboard controls, browser speech and sound</dd>
                </div>
                <div>
                  <dt>Agent layer</dt>
                  <dd>OpenAI Agents SDK with typed output and explicit tool contracts</dd>
                </div>
                <div>
                  <dt>Grounding</dt>
                  <dd>Local classic-game catalogs plus deterministic scoring and ID validation</dd>
                </div>
                <div>
                  <dt>Verification</dt>
                  <dd>Unit tests, turn-level eval traces, and desktop/mobile Playwright flows</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="what-i-did">
              <h2 id="what-i-did">What I did</h2>

              <h3>I split judgment from enforcement</h3>
              <p>
                The agent can interpret free-form preferences, decide when it has enough signal,
                and choose which grounded recommendation to reveal. Ordinary code owns the catalog
                search, scoring thresholds, accepted IDs, and final display state. The interface
                never has to trust a model-invented game or match percentage.
              </p>

              <h3>I engineered the context, not just the prompt</h3>
              <p>
                Each turn receives the selected consoles, a compact preference profile, durable
                session notes, recent conversation, and a bounded set of scored candidates. The
                current implementation limits recent messages and candidate lists so the model sees
                useful evidence without repeatedly swallowing the full catalog or transcript.
              </p>

              <h3>I gave the agent narrow tools</h3>
              <p>
                The workflow exposes separate tools for scoring candidates, searching the full
                catalog by title, and opening the recommendation showcase. The reveal tool validates
                its inputs against current scoring before the interface changes. Tool use became an
                observable product event instead of an implication hidden in prose.
              </p>

              <h3>I turned failures into eval cases</h3>
              <p>
                The eval suite starts from user and job stories, expresses them as turn-level traces,
                and combines deterministic assertions with rubrics for language and behavior. Fixed
                bugs become regression cases. Browser flows separately check focus, keyboard use,
                console selection, reset behavior, and recommendation reveals.
              </p>
            </section>

            <section aria-labelledby="what-i-learned">
              <h2 id="what-i-learned">What I learned</h2>

              <h3>Context engineering is product engineering</h3>
              <p>
                A model cannot make a good decision from “more context” in the abstract. It needs the
                right state, in a stable shape, at the moment of decision. Selecting, bounding, and
                naming that context changed behavior more reliably than piling on extra instructions.
              </p>

              <h3>Agent orchestration is a contract, not an agent count</h3>
              <p>
                WizWor uses one decision-making agent, typed tools, and deterministic guardrails.
                That was enough orchestration for this job. The hard part was assigning ownership:
                the model interprets and chooses; software validates, computes, and renders.
              </p>

              <h3>The last mile needs code</h3>
              <p>
                An agent saying “I recommend this” is not the same as the product showing a verified
                result. A dedicated reveal tool, schema validation, scoped retry behavior, and a
                deterministic fallback close the gap between a plausible answer and a working flow.
              </p>

              <h3>Evals need to resemble use</h3>
              <p>
                Recommendation scoring alone did not catch conversational stalls, ignored typed input,
                focus bugs, or a reveal that never opened. The useful suite crosses layers: trace
                checks for the agent, unit tests for deterministic rules, and browser checks for what
                the player can actually do.
              </p>
            </section>

            <section className={styles.callout} aria-labelledby="current-best">
              <h2 id="current-best">Current best</h2>
              <p>
                WizWor is evidence of a working engineering loop: build a thin product, observe where
                the agent and interface disagree, move fragile behavior into explicit contracts, and
                preserve each fix as a test. That learning remains useful even when a larger product
                later solves part of the original problem better.
              </p>
            </section>

            <section className={styles.limits} aria-labelledby="limits">
              <h2 id="limits">Limits and open questions</h2>
              <ul>
                <li>There are no public adoption or business-impact results to claim.</li>
                <li>Recommendation quality still depends on catalog metadata and the coverage of the eval cases.</li>
                <li>The live experience uses a hosted model, so a successful session can create API cost.</li>
                <li>A genuine, publication-ready screenshot still needs to be captured and added to this site.</li>
              </ul>
            </section>

            <LabProjectLinks
              project={project}
              description="You have reached the external links after the case study. The live product shows the experience, while the public repository shows the implementation and test history."
            />
          </div>
        </article>
      </main>
    </>
  );
}
