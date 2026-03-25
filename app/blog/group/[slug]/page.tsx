import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllGroups, getGroupBySlug } from '@/lib/blog';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return getAllGroups().map(g => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const group = getGroupBySlug(params.slug);
  if (!group) return {};
  return {
    title: group.title,
    description: group.description ?? `Essays in ${group.title}`,
  };
}

export default function GroupPage({ params }: { params: { slug: string } }) {
  const group = getGroupBySlug(params.slug);
  if (!group) notFound();

  return (
    <div className="w-full px-4 py-8">
      <div
        className="austenbox"
        style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}
      >
        <Link href="/blog" className="button-link inline-block mb-6">
          &larr; All groups
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gaysparkles">{group.title}</h1>
          {group.description && (
            <p className="text-[var(--fg-muted)] max-w-xl">
              {group.description}
            </p>
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
