import Link from 'next/link';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getAllPosts } from '@/lib/blog';
import SubscribeForm from '@/app/components/SubscribeForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Arcades — Field Notes',
  description: 'Latest essays and dispatches from Austen Tucker.',
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  const posts = (await getAllPosts()).slice(0, 10);

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 gaysparkles">Field Notes</h1>
          <p className="text-[var(--fg-muted)] max-w-xl mx-auto">
            Latest essays, in chronological order.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)]">No posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-12">
            {posts.map(post => (
              <article
                key={post.slug}
                className="border-b border-[var(--border)] pb-12 last:border-b-0"
              >
                <header className="mb-6">
                  {post.group && (
                    <p className="text-sm text-[var(--fg-muted)] mb-2">
                      <Link
                        href={`/writing/group/${post.group}`}
                        className="text-[var(--accent)] hover:underline font-medium"
                      >
                        {post.group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Link>
                    </p>
                  )}
                  <h2 className="text-2xl font-bold mb-2 gaysparkles">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[var(--neon-pink)] transition-colors">
                      {post.title}
                    </Link>
                  </h2>
                  <time className="text-sm text-[var(--fg-muted)]">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </header>

                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <RichText data={post.content} />
                </div>

                <div className="mt-6">
                  <Link href={`/blog/${post.slug}`} className="button-link text-sm">
                    Permalink &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12">
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
