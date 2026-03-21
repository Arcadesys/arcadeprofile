import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllStories, getStory } from '@/lib/stories';
import SubscribeForm from '@/app/components/SubscribeForm';

export function generateStaticParams() {
  return getAllStories().map(s => ({ story: s.slug }));
}

export default function StoryIndexPage({ params }: { params: { story: string } }) {
  const story = getStory(params.story);
  if (!story) notFound();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <div className="mb-8">
          <Link href="/series" className="button-link inline-block mb-6">
            &larr; All series
          </Link>

          <div className="flex flex-col sm:flex-row gap-6">
            {story.coverImage && (
              <div className="sm:w-56 flex-shrink-0">
                <Image
                  src={story.coverImage}
                  alt={`Cover for ${story.title}`}
                  width={224}
                  height={300}
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold gaysparkles">{story.title}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  story.status === 'complete'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {story.status === 'complete' ? 'Complete' : 'In Progress'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {story.chapterCount} {story.chapterCount === 1 ? 'chapter' : 'chapters'}
              </p>
              {story.description && (
                <div className="prose dark:prose-invert max-w-none">
                  <MDXRemote source={story.description} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Chapters</h2>
          {story.chapters.length === 0 ? (
            <p className="text-gray-500">No chapters published yet.</p>
          ) : (
            <ol className="space-y-3">
              {story.chapters.map(ch => (
                <li key={ch.chapter}>
                  <Link
                    href={`/stories/${story.slug}/${ch.chapter}`}
                    className="flex items-baseline gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                  >
                    <span className="text-sm font-mono text-gray-400 dark:text-gray-500 w-8 text-right flex-shrink-0">
                      {ch.chapter}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors">
                        {ch.title}
                      </span>
                      {ch.excerpt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{ch.excerpt}</p>
                      )}
                    </div>
                    <time className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {new Date(ch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        {story.status === 'in-progress' && (
          <div className="mt-8">
            <SubscribeForm />
          </div>
        )}
      </div>
    </div>
  );
}
