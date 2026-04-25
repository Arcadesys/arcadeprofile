import { RichText } from '@payloadcms/richtext-lexical/react';
import { getPageBySlug } from '@/lib/blog';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('about');
  if (!page) {
    return {
      title: 'About | The Arcades',
      description: 'The story of Austen Tucker: novelist, cat herder, builder, and the person behind The Arcades.',
    };
  }
  return {
    title: page.meta?.title ?? page.title,
    description: page.meta?.description ?? page.excerpt,
  };
}

export default async function AboutPage() {
  const page = await getPageBySlug('about');
  if (!page) return <StaticAboutPage />;

  return (
    <div style={{ maxWidth: '740px', margin: '0 auto', padding: '2rem 1rem' }}>
      <section style={{ marginBottom: '3rem', marginTop: '2rem' }}>
        <h1
          className="gaysparkles"
          style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}
        >
          {page.title}
        </h1>

        {page.intro && (
          <div
            style={{
              padding: '1.5rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              marginBottom: '2.5rem',
            }}
          >
            {page.intro_label && (
              <p style={{ margin: '0 0 1rem', fontStyle: 'italic', color: 'var(--fg-muted)' }}>
                {page.intro_label}
              </p>
            )}
            <div className="prose prose-invert max-w-none">
              <RichText data={page.intro} />
            </div>
          </div>
        )}
      </section>

      <section style={{ lineHeight: 1.8 }}>
        <div className="prose prose-invert max-w-none">
          <RichText data={page.content} />
        </div>
      </section>

      {page.outro && (
        <section
          style={{
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            marginBottom: '2rem',
            marginTop: '2rem',
          }}
        >
          <div className="prose prose-invert max-w-none">
            <RichText data={page.outro} />
          </div>
          {page.byline && (
            <p style={{ margin: '1rem 0 0', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
              &mdash; {page.byline}
            </p>
          )}
        </section>
      )}

      {page.footer_text && (
        <footer
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            opacity: 0.8,
            padding: '1rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <p>
            {page.footer_text}
            {page.footer_link_href && page.footer_link_label && (
              <>
                {' '}
                <a
                  href={page.footer_link_href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                  style={{ textDecoration: 'underline' }}
                >
                  {page.footer_link_label}
                </a>
              </>
            )}
          </p>
        </footer>
      )}
    </div>
  );
}

function StaticAboutPage() {
  return (
    <div style={{ maxWidth: '740px', margin: '0 auto', padding: '2rem 1rem' }}>
      <section style={{ marginBottom: '3rem', marginTop: '2rem' }}>
        <h1
          className="gaysparkles"
          style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}
        >
          About
        </h1>

        <div
          style={{
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            marginBottom: '2.5rem',
          }}
        >
          <p style={{ margin: 0, color: 'var(--fg-muted)', lineHeight: 1.7 }}>
            Austen Tucker is a cat herder, scrum master, novelist, and full-stack developer based in Chicago.
            They are queer, legally blind, neurodivergent, and plural: a system who go by the Arcades.
          </p>
        </div>
      </section>

      <section style={{ lineHeight: 1.8 }}>
        <h2 style={{ textAlign: 'left' }}>The short version</h2>
        <p>
          Austen writes fiction about identity, transformation, disability, queerness, and belonging.
          They build tools for people traditional tech forgets, and this site is the permanent home
          for the books, experiments, essays, and systems that come out of that work.
        </p>

        <h2 style={{ textAlign: 'left' }}>Before the genre had a shelf</h2>
        <p>
          Austen started publishing fiction before they were old enough to drive. Their early work came
          out of furry fandom, where stories about bodies, names, transformation, and chosen community
          could say things mainstream publishing did not yet know how to hold.
        </p>
        <p>
          They were nominated for an Ursa Major Award in high school, helped define what people now call
          eggfic years before the term existed, and have writing archived in the Strong National Museum
          of Play.
        </p>

        <h2 style={{ textAlign: 'left' }}>The books</h2>
        <p>
          Austen has twelve novels written, five published so far, and more waiting for revision. The work
          includes YA fantasy, queer identity, civil rights allegory, toon logic, catgirls with feelings,
          and stories about trying to become yourself when the world keeps naming you wrong.
        </p>

        <h2 style={{ textAlign: 'left' }}>The machines</h2>
        <p>
          Austen runs an AI-assisted editorial workflow built around accessibility. It is not a replacement
          for human creativity. It is infrastructure: a way to make revision, continuity, and editorial
          memory work for a blind, neurodivergent writer whose stories were already there.
        </p>

        <h2 style={{ textAlign: 'left' }}>What this site is</h2>
        <p>
          This is not just a portfolio. It is a permanent address. The blog runs on RSS, the projects live
          here, the samples live here, and the tools get built here. Pull, not push. The door does not move.
        </p>
      </section>
    </div>
  );
}
