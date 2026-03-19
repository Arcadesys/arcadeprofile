import Link from 'next/link';
import Image from 'next/image';
import { getAllStories } from '@/lib/stories';

export default function StoriesPage() {
  const stories = getAllStories();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-8 text-center gaysparkles">Stories</h1>

        {stories.length === 0 ? (
          <p className="text-center text-gray-500">No stories yet. Check back soon!</p>
        ) : (
          <div className="space-y-6">
            {stories.map(story => (
              <article key={story.slug} className="border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 overflow-hidden">
                <Link href={`/stories/${story.slug}`} className="flex flex-col sm:flex-row">
                  {story.coverImage && (
                    <div className="sm:w-48 sm:flex-shrink-0">
                      <Image
                        src={story.coverImage}
                        alt={`Cover for ${story.title}`}
                        width={192}
                        height={256}
                        className="w-full h-48 sm:h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors">
                        {story.title}
                      </h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        story.status === 'complete'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {story.status === 'complete' ? 'Complete' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {story.chapterCount} {story.chapterCount === 1 ? 'chapter' : 'chapters'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">{story.excerpt}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
