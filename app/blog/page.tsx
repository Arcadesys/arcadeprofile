import Link from 'next/link';
import { getAllGroups, getUngroupedPosts } from '@/lib/blog';
import SubscribeForm from '@/app/components/SubscribeForm';

export default function BlogPage() {
  const groups = getAllGroups();
  const ungrouped = getUngroupedPosts();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Writing</h1>
        <p className="text-center text-[var(--fg-muted)] mb-8 max-w-xl mx-auto">
          Essays, stories, and other collected texts — organized by topic.
        </p>

        {groups.length === 0 && ungrouped.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)]">No posts yet. Check back soon!</p>
        ) : (
          <>
            {/* Group cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {groups.map(group => {
                const latest = group.posts[group.posts.length - 1];
                return (
                  <Link
                    key={group.slug}
                    href={`/blog/group/${group.slug}`}
                    className="group block border border-[var(--border)] rounded-lg p-6 bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:shadow-lg hover:shadow-[var(--glow-pink)] transition-all"
                  >
                    <h2 className="text-xl font-semibold text-[var(--fg)] group-hover:text-[var(--neon-pink)] transition-colors mb-1">
                      {group.title}
                    </h2>
                    {group.description && (
                      <p className="text-sm text-[var(--fg-muted)] mb-3 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
                      <span>
                        {group.posts.length} {group.posts.length === 1 ? 'essay' : 'essays'}
                      </span>
                      {latest?.date && (
                        <span>
                          Latest:{' '}
                          {new Date(latest.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Ungrouped posts (if any) */}
            {ungrouped.length > 0 && (
              <>
                <h2 className="text-xl font-semibold mb-4 text-[var(--fg)]">Standalone</h2>
                <div className="space-y-4">
                  {ungrouped.map(post => (
                    <article
                      key={post.slug}
                      className="border border-[var(--border)] rounded-lg bg-[var(--surface)] p-5"
                    >
                      <Link href={`/blog/${post.slug}`}>
                        <h3 className="text-lg font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors mb-1">
                          {post.title}
                        </h3>
                      </Link>
                      <time className="text-sm text-[var(--fg-muted)] mb-2 block">
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                      <p className="text-[var(--fg-muted)] mb-3">{post.excerpt}</p>
                      <Link href={`/blog/${post.slug}`} className="button-link inline-block">
                        Read more
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-12">
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
