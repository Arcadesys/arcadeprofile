import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllEssaySeries, getEssaySeriesBySlug } from '@/lib/series';

export function generateStaticParams() {
  return getAllEssaySeries().map(s => ({ slug: s.slug }));
}

export default function EssaySeriesPage({
  params,
}: {
  params: { slug: string };
}) {
  const series = getEssaySeriesBySlug(params.slug);
  if (!series) notFound();

  return (
    <div className="w-full px-4 py-8">
      <div
        className="austenbox"
        style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}
      >
        <Link href="/series" className="button-link inline-block mb-6">
          &larr; All series
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gaysparkles">{series.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Essay series &middot; {series.posts.length}{' '}
            {series.posts.length === 1 ? 'part' : 'parts'}
          </p>
        </header>

        <ol className="space-y-3">
          {series.posts.map((post, idx) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="flex items-baseline gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
              >
                <span className="text-sm font-mono text-gray-400 dark:text-gray-500 w-8 text-right flex-shrink-0">
                  {post.seriesPart ?? idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors">
                    {post.title}
                  </span>
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <time className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
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
