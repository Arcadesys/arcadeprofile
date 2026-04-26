import { notFound } from 'next/navigation';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getPageBySlug } from '@/lib/blog';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('bio');
  if (!page) return {};
  return {
    title: page.meta?.title ?? page.title,
    description: page.meta?.description ?? page.excerpt,
  };
}

export default async function BioPage() {
  const page = await getPageBySlug('bio');
  if (!page) notFound();

  return (
    <div className="austenbox" style={{ maxWidth: '740px', margin: '0 auto' }}>
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
