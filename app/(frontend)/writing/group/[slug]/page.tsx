import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllGroups, getBlobImagesByGroupSlug, getGroupBySlug } from '@/lib/blog';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  try {
    const groups = await getAllGroups();
    return groups.map(g => ({ slug: g.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) return {};
  return {
    title: group.title,
    description: group.description ?? `Essays in ${group.title}`,
  };
}

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) notFound();
  const galleryImages = await getBlobImagesByGroupSlug(slug);

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
            <p className="text-[var(--fg-muted)] max-w-xl">
              {group.description}
            </p>
          )}
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            {group.posts.length} {group.posts.length === 1 ? 'essay' : 'essays'}
          </p>
        </header>

        {galleryImages.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryImages.map((image) => (
                <figure
                  key={image.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    loading="lazy"
                    className="w-full h-56 object-cover"
                  />
                  {image.caption && (
                    <figcaption className="text-sm text-[var(--fg-muted)] p-3">{image.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

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
