import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjectBySlug } from '@/lib/payload';
import SubscribeCTA from '@/app/components/SubscribeCTA';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const title = `${project.title} — The Arcades`;
  return {
    title,
    description: project.description,
  };
}

export default async function ProjectHubPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const startHref = `/projects/${slug}/00`;

  return (
    <main
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 4rem) 1rem clamp(3rem, 8vw, 6rem)',
      }}
    >
      <Link
        href="/projects"
        style={{
          display: 'inline-block',
          marginBottom: '1.5rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          letterSpacing: '0.06em',
          color: 'var(--fg-muted)',
          textDecoration: 'none',
        }}
      >
        ← All projects
      </Link>

      <h1
        style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          lineHeight: 1.15,
          marginBottom: '0.75rem',
        }}
      >
        {project.title}
      </h1>

      {project.description && (
        <p
          style={{
            color: 'var(--fg-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            marginBottom: '2rem',
          }}
        >
          {project.description}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '3rem',
        }}
      >
        <Link
          href={startHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 1.25rem',
            background: 'var(--neon-pink)',
            color: '#000',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            boxShadow: '0 0 18px var(--glow-pink)',
          }}
        >
          Start reading →
        </Link>
        <a
          href="#subscribe"
          className="button-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.55rem 1.15rem',
            fontSize: '0.88rem',
          }}
        >
          Or get it by email
        </a>
      </div>

      <section id="subscribe" style={{ scrollMarginTop: '5rem' }}>
        <SubscribeCTA
          source="project-hub"
          magnet="story"
          heading="Want the next chapter when it drops?"
          blurb="Read the first installment now, or subscribe and follow along by email — a weekly roundup, or every installment as it lands. Sign up and I'll send La Ligne du Marais — a Paris noir short — to start."
          buttonLabel="Send the story"
        />
      </section>
    </main>
  );
}
