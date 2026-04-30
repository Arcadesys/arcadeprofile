import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bio — The Arcades',
  description: 'Austen Tucker-Crowder: AI enablement leader, program manager, agile coach, and builder of weird things.',
  openGraph: {
    title: 'Bio — The Arcades',
    description: 'Who is Austen Tucker-Crowder? A bit of everything: AI transformation lead, facilitator, dev, writer, and maker.',
    url: 'https://thearcades.me/bio',
  },
};

const sectionHeadingStyle = {
  fontSize: '1.3rem',
  marginBottom: '1rem',
  color: 'var(--accent)',
  borderBottom: '1px solid var(--border)',
  paddingBottom: '0.5rem',
} as const;

const cardStyle = {
  padding: '1.25rem',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  marginBottom: '1rem',
} as const;

const tagStyle = {
  display: 'inline-block',
  padding: '0.2rem 0.65rem',
  background: 'var(--btn-bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-pill)',
  fontSize: '0.82rem',
  color: 'var(--fg-muted)',
  marginRight: '0.4rem',
  marginBottom: '0.4rem',
} as const;

function Tag({ label }: { label: string }) {
  return <li style={tagStyle}>{label}</li>;
}

export default function BioPage() {
  return (
    <main style={{ maxWidth: '740px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <section style={{ marginBottom: '2.5rem', marginTop: '2rem', textAlign: 'center' }}>
        <h1 className="gaysparkles" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          Austen Tucker-Crowder
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '1.05rem', margin: '0 0 0.5rem' }}>
          AI transformation lead &middot; program manager &middot; agile coach &middot; maker of things
        </p>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
          Chicago, IL
        </p>
      </section>

      {/* Who I am */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>Who I am</h2>
        <div style={cardStyle}>
          <p style={{ lineHeight: 1.8, margin: '0 0 1rem' }}>
            I&apos;m Austen — a builder, facilitator, and professional chaos-wrangler based in Chicago.
            By day I lead AI enablement and transformation at ActiveCampaign, where I help teams
            figure out what it actually means to build an AI-first company (spoiler: it&apos;s mostly
            about changing how people think, not just what tools they use).
          </p>
          <p style={{ lineHeight: 1.8, margin: '0 0 1rem' }}>
            I have a background in English and rhetoric, which means I care a lot about how ideas
            are communicated — in meetings, in code, in documentation, and in the stories we tell
            ourselves about why we&apos;re doing what we&apos;re doing.
          </p>
          <p style={{ lineHeight: 1.8, margin: 0 }}>
            Outside of work I build personal software projects, write fiction, make things with my
            hands, and think too hard about board game design. This site is one of those projects.
          </p>
        </div>
      </section>

      {/* What I do */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>What I do</h2>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            {
              title: 'AI Enablement',
              body: 'Designing the systems, curricula, and cultural scaffolding that let organizations actually use AI — not just buy it.',
            },
            {
              title: 'Facilitation',
              body: 'Running workshops, Worksites, and decision-forcing sessions that actually produce artifacts, not just sticky notes.',
            },
            {
              title: 'Program Management',
              body: 'Cross-functional coordination across engineering, product, design, and exec leadership — keeping things moving and honest.',
            },
            {
              title: 'Building',
              body: 'Writing code, shipping tools, and making software that I or other people actually want to use.',
            },
          ].map(({ title, body }) => (
            <li key={title} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--accent)' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--fg-muted)' }}>{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Interests */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>Interests &amp; obsessions</h2>
        <div style={cardStyle}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'AI agents & tooling', 'board game design', 'fiction writing', 'facilitation theory',
              'MCP servers', 'constructivism', 'accessibility', 'Next.js', 'Payload CMS',
              'systems thinking', 'Agile coaching', 'Cursor IDE', 'weird personal projects',
              'Chicago', 'tabletop RPGs',
            ].map((t) => <Tag key={t} label={t} />)}
          </ul>
        </div>
      </section>

      {/* This site */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>About this site</h2>
        <div style={cardStyle}>
          <p style={{ lineHeight: 1.8, margin: '0 0 1rem' }}>
            The Arcades is my personal corner of the internet. It&apos;s built with Next.js 15, Payload CMS,
            and deployed on Vercel — and it doubles as a sandbox where I try things out.
          </p>
          <p style={{ lineHeight: 1.8, margin: 0 }}>
            The name comes from Walter Benjamin&apos;s <em>The Arcades Project</em> — a sprawling,
            unfinished collection of fragments about modernity, commerce, and the passage of time.
            It felt right for a site that&apos;s also sprawling and perpetually under construction.
          </p>
        </div>
      </section>

      {/* Links */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>Find me</h2>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:austen.crowder@gmail.com">austen.crowder@gmail.com</a>
          </p>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
            <strong>GitHub:</strong>{' '}
            <a href="https://github.com/Arcadesys" target="_blank" rel="noopener noreferrer">
              github.com/Arcadesys
            </a>
          </p>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            <strong>Site:</strong>{' '}
            <a href="/">thearcades.me</a>
          </p>
        </div>
      </section>

    </main>
  );
}
