import Link from 'next/link';
import Image from 'next/image';
import { getSeriesHubRows } from '@/lib/series';

export default function SeriesPage() {
  const rows = getSeriesHubRows();

  return (
    <div className="w-full px-4 py-8">
      <div
        className="austenbox"
        style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}
      >
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Series</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
          Serialized fiction, essays, and other multi-part work in one place.
        </p>

        {rows.length === 0 ? (
          <p className="text-center text-gray-500">
            Nothing here yet. When you publish a story with chapters or tag blog
            posts with a <code className="text-sm">series</code> slug, they will
            show up here.
          </p>
        ) : (
          <div className="space-y-6">
            {rows.map(row => {
              if (row.kind === 'story') {
                const story = row.data;
                return (
                  <article
                    key={`story-${story.slug}`}
                    className="border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 overflow-hidden"
                  >
                    <Link
                      href={`/stories/${story.slug}`}
                      className="flex flex-col sm:flex-row"
                    >
                      {story.coverImage && (
                        <div className="sm:w-32 sm:flex-shrink-0">
                          <Image
                            src={story.coverImage}
                            alt={`Cover for ${story.title}`}
                            width={128}
                            height={170}
                            className="w-full h-32 sm:h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6 flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors">
                            {story.title}
                          </h2>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            Fiction
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              story.status === 'complete'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {story.status === 'complete'
                              ? 'Complete'
                              : 'In progress'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {story.chapterCount}{' '}
                          {story.chapterCount === 1 ? 'chapter' : 'chapters'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
                          {story.excerpt}
                        </p>
                      </div>
                    </Link>
                  </article>
                );
              }

              const essay = row.data;
              const latest = essay.posts[essay.posts.length - 1];
              return (
                <article
                  key={`essay-${essay.slug}`}
                  className="border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-6"
                >
                  <Link href={`/series/essay/${essay.slug}`}>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors">
                        {essay.title}
                      </h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        Essays
                      </span>
                    </div>
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {essay.posts.length}{' '}
                    {essay.posts.length === 1 ? 'part' : 'parts'}
                    {latest?.date && (
                      <>
                        {' '}
                        &middot; latest{' '}
                        {new Date(latest.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </>
                    )}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    {essay.posts[0]?.excerpt}
                  </p>
                  <Link
                    href={`/series/essay/${essay.slug}`}
                    className="button-link inline-block"
                  >
                    Open series
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
