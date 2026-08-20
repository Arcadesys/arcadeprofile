import type { Metadata } from 'next';
import Link from 'next/link';

import { requireLabProject } from '@/data/lab-projects';
import { JsonLd } from '@/lib/structured-data';

import { LabProjectLinks } from '../LabProjectLinks';
import { LabProjectVisual } from '../LabProjectVisual';
import styles from '../lab.module.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.thearcades.me').replace(/\/+$/, '');
const project = requireLabProject('conductor');
const DESCRIPTION =
  'How Austen Tucker built Conductor, a local approval-gated control plane for bounded Codex and Claude work, and what it taught about plans, authority, receipts, and review.';

export const metadata: Metadata = {
  title: 'Conductor | The Arcades Lab',
  description: DESCRIPTION,
  alternates: { canonical: '/lab/conductor' },
  openGraph: {
    type: 'article',
    title: 'Conductor | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
    url: '/lab/conductor',
  },
  twitter: {
    card: 'summary',
    title: 'Conductor | The Arcades Lab | Free Play Publishing',
    description: DESCRIPTION,
  },
};

export default function ConductorCaseStudyPage() {
  const pageUrl = `${SITE_URL}/lab/${project.slug}`;
  const caseStudyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Conductor',
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
      { name: 'Conductor', item: pageUrl },
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
            <p className={styles.eyebrow}>The Arcades Lab · Case study 04</p>
            <p className={styles.status}>{project.status}</p>
            <h1>Conductor</h1>
            <p className={styles.lede}>
              Lab Infrastructure: a working local control plane for approval-gated Codex and
              Claude work, shaped like the project board people already know how to read.
            </p>
          </header>

          <LabProjectVisual project={project} hero priority />

          <div className={styles.story}>
            <section aria-labelledby="why-build-it">
              <h2 id="why-build-it">Why I built it</h2>
              <p>
                Agent work gets risky when the plan, authority, execution, and evidence collapse
                into one conversation. I wanted a local system where a person can see the Story,
                inspect the plan, approve a specific scope, watch bounded work, and review a receipt
                before anything is called done.
              </p>
              <p>
                Conductor formalizes the same staged-authority and evidence model that projects such
                as WizWor taught me. It did not orchestrate the WizWor launch. It turns those lessons
                into reusable Lab infrastructure for later Codex and Claude work.
              </p>
            </section>

            <section aria-labelledby="build-snapshot">
              <h2 id="build-snapshot">Build snapshot</h2>
              <dl className={styles.snapshot}>
                <div>
                  <dt>Interface</dt>
                  <dd>React and Vite with a Jira-shaped backlog, Board, issue detail, Activity, and settings</dd>
                </div>
                <div>
                  <dt>Control plane</dt>
                  <dd>Local Node and Express service with service-owned SQLite, WAL mode, and backups</dd>
                </div>
                <div>
                  <dt>Agent runtime</dt>
                  <dd>Per-project Codex or Claude planner, worker, and evaluator roles in bounded workspaces</dd>
                </div>
                <div>
                  <dt>Authority</dt>
                  <dd>Dispatch off by default, exact plan-hash approval, explicit review, and recorded receipts</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="what-i-did">
              <h2 id="what-i-did">What I did</h2>

              <h3>I made work state visible</h3>
              <p>
                Projects, Epics, Stories, plans, approvals, runs, receipts, and activity live in a
                local database rather than disappearing into agent transcripts. The board shows when
                a Story is waiting for a plan, queued, running, blocked, in review, or accepted.
              </p>

              <h3>I bound approval to an immutable plan hash</h3>
              <p>
                Moving a Story to To Do creates a read-only planning run. Approval checks that the
                plan is still the latest version and that its stored body still produces the approved
                SHA-256 hash. A changed or superseded plan cannot borrow authority from an older yes.
              </p>

              <h3>I bounded execution</h3>
              <p>
                The supervisor caps concurrent workers, permits only one non-planning run per project,
                uses role-specific timeouts, supports cancellation, and marks live runs interrupted
                after a restart instead of silently relaunching them. Repository writes happen in an
                isolated worktree unless a project explicitly chooses a shared workspace.
              </p>

              <h3>I separated completion from acceptance</h3>
              <p>
                A successful worker stops in In Review. Higher-risk work can receive a separate,
                read-only evaluator pass. Only explicit user acceptance moves the Story to Done.
                Interactive sessions write an atomic completion receipt inside the workspace; a
                host-side launcher validates and submits it after the agent exits.
              </p>

              <h3>I kept consequential actions outside repository-write authority</h3>
              <p>
                The current worker grant is scoped to local repository work. Its contract explicitly
                excludes merge, deployment, publication, material deletion, spending, and external
                messages. Those actions require a separate action-scope approval instead of being
                smuggled inside “implement this plan.”
              </p>
            </section>

            <section aria-labelledby="what-i-learned">
              <h2 id="what-i-learned">What I learned</h2>

              <h3>Authority needs stages</h3>
              <p>
                Approving a goal is not the same as approving a plan, and approving repository edits
                is not permission to merge or publish them. Naming those stages makes both humans and
                agents less likely to over-read a vague instruction.
              </p>

              <h3>Evidence has to cross the trust boundary</h3>
              <p>
                A final chat message is not enough. Structured receipts, verification mappings,
                persisted run state, and host-side submission make it possible to ask what completed,
                what was actually checked, and whether the handoff is ready for review.
              </p>

              <h3>The project board is part of the safety system</h3>
              <p>
                A familiar backlog and Board are not decoration. They expose blocked work, pending
                approval, queue state, and review status without requiring someone to reconstruct the
                workflow from terminal output.
              </p>

              <h3>Provider abstractions still leak</h3>
              <p>
                Codex and Claude differ in sandbox flags, output capture, usage reporting, and
                interactive-session behavior. A shared role model helps, but provider-specific
                launchers and receipts still need direct tests and conservative status reporting.
              </p>
            </section>

            <section className={styles.callout} aria-labelledby="current-best">
              <h2 id="current-best">Current best</h2>
              <p>
                Conductor is a working local prototype on the{' '}
                <code>feature/claude-code-session-from-board</code> branch. It proves the core loop:
                plan read-only, approve the exact hash, execute within a bounded workspace, collect
                evidence, stop in review, and wait for a person to accept the result.
              </p>
            </section>

            <section className={styles.limits} aria-labelledby="limits">
              <h2 id="limits">Limits and open questions</h2>
              <ul>
                <li>Conductor is a local prototype and internal orchestration system, not a hosted production platform.</li>
                <li>The current approval endpoint issues repository-write authority. The UI and API for granting additional action scopes are not complete.</li>
                <li>Provider token metrics are exercised through fake Codex and Claude harnesses; real-provider metric coverage remains incomplete.</li>
                <li>Browser tests verify the session controls without launching real interactive agents, so the live multi-provider harness still has coverage gaps.</li>
                <li>No public adoption, reliability, or business-impact result is claimed.</li>
                <li>A permission-safe, publication-ready screenshot still needs to be captured from demo data.</li>
              </ul>
            </section>

            <LabProjectLinks
              project={project}
              description="You have reached the only external destination after the case study. Conductor has no public live app; the repository contains the current local prototype and its verification history."
            />
          </div>
        </article>
      </main>
    </>
  );
}
