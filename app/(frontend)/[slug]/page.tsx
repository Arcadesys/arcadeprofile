import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getPageBySlug, getAllPages, getGroupBySlug, getAllGroups } from '@/lib/blog';
import type { Metadata } from 'next';

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const [pages, groups] = await Promise.all([getAllPages(), getAllGroups()]);
    return [
      ...pages.map((p) => ({ slug: p.slug })),
      ...groups.map((g) => ({ slug: g.slug })),
    ];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const page = await getPageBySlug(slug);
  if (page) {
    return {
      title: page.meta?.title ?? page.title,
      description: page.meta?.description ?? page.excerpt,
    };
  }

  const group = await getGroupBySlug(slug);
  if (group) {
    return {
      title: group.title,
      description: group.description ?? `Essays in ${group.title}`,
    };
  }

  return {};
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Try Pages first
  const page = await getPageBySlug(slug);
  if (page) {
    return <PageView page={page} />;
  }

  // 2. Fall back to Groups
  const group = await getGroupBySlug(slug);
  if (group) {
    return (
      <div className="w-full px-4 py-8">
        <div
          className="austenbox"
          style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}
        >
          <Link href="/writing" className="button-link inline-block mb-6">
            &larr; All writing
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2 gaysparkles">{group.title}</h1>
            {group.description && (
              <p className="text-[var(--fg-muted)] max-w-xl">{group.description}</p>
            )}
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              {group.posts.length} {group.posts.length === 1 ? 'essay' : 'essays'}
            </p>
          </header>

          <ol className="space-y-3">
            {group.posts.map((post, idx) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex items-baseline gap-3 p-3 rounded-lg border border-[var(--border)] hover:shadow-md hover:shadow-[var(--glow-pink)] transition-shadow bg-[var(--surface)]"
                >
                  <span className="text-sm font-mono text-[var(--fg-muted)] w-8 text-right flex-shrink-0">
                    {post.order ?? idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[var(--fg)] hover:text-[var(--accent)] transition-colors">
                      {post.title}
                    </span>
                    {post.excerpt && (
                      <p className="text-sm text-[var(--fg-muted)] mt-0.5 truncate">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-[var(--fg-muted)] flex-shrink-0">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  notFound();
}

function PageView({ page }: { page: Awaited<ReturnType<typeof getPageBySlug>> & object }) {
  return (
    <div style={{ maxWidth: '740px', margin: '0 auto', padding: '2rem 1rem' }}>
      <section style={{ marginBottom: '3rem', marginTop: '2rem' }}>
        <h1
          className="gaysparkles"
          style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}
        >
          {page!.title}
        </h1>

        {page!.intro && (
          <div
            style={{
              padding: '1.5rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              marginBottom: '2.5rem',
            }}
          >
            {page!.intro_label && (
              <p style={{ margin: '0 0 1rem', fontStyle: 'italic', color: 'var(--fg-muted)' }}>
                {page!.intro_label}
              </p>
            )}
            <div className="prose prose-invert max-w-none">
              <RichText data={page!.intro} />
            </div>
          </div>
        )}
      </section>

      <section style={{ lineHeight: 1.8 }}>
        <div className="prose prose-invert max-w-none">
          <RichText data={page!.content} />
        </div>
      </section>

      {page!.outro && (
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
            <RichText data={page!.outro} />
          </div>
          {page!.byline && (
            <p style={{ margin: '1rem 0 0', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
              &mdash; {page!.byline}
            </p>
          )}
        </section>
      )}

      {page!.footer_text && (
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
            {page!.footer_text}
            {page!.footer_link_href && page!.footer_link_label && (
              <>
                {' '}
                <a
                  href={page!.footer_link_href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                  style={{ textDecoration: 'underline' }}
                >
                  {page!.footer_link_label}
                </a>
              </>
            )}
          </p>
        </footer>
      )}
    </div>
  );
}
