import Link from 'next/link';
import { getSamplePosts } from '@/lib/blog';

export const dynamic = 'force-dynamic';

export default async function SamplesPage() {
  const posts = await getSamplePosts();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <h1 className="text-3xl font-bold mb-3 text-center gaysparkles">Samples</h1>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-[var(--fg-muted)]">
          Read a sample, then subscribe or join the beta list when something catches.
        </p>

        {posts.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)]">
            No samples are published right now. Mark a published post as a sample in Payload to show it here.
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <article
                key={post.slug}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link href={`/blog/${post.slug}`}>
                      <h2 className="mb-2 text-xl font-semibold text-[var(--fg)] transition-colors hover:text-[var(--neon-pink)]">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="m-0 text-sm leading-relaxed text-[var(--fg-muted)]">{post.excerpt}</p>
                    <time className="mt-3 block text-xs uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <Link href={`/blog/${post.slug}`} className="button-link shrink-0 text-center">
                    {post.sampleLabel || 'Read Sample'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
