import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllStories, getStory, getChapter } from '@/lib/stories';

export function generateStaticParams() {
  const stories = getAllStories();
  const params: { story: string; chapter: string }[] = [];
  for (const s of stories) {
    const detail = getStory(s.slug);
    if (!detail) continue;
    for (const ch of detail.chapters) {
      params.push({ story: s.slug, chapter: String(ch.chapter) });
    }
  }
  return params;
}

export default function ChapterPage({ params }: { params: { story: string; chapter: string } }) {
  const chapterNum = parseInt(params.chapter, 10);
  if (isNaN(chapterNum)) notFound();

  const chapter = getChapter(params.story, chapterNum);
  if (!chapter) notFound();

  const progressLabel = chapter.totalChapters > 0
    ? `Chapter ${chapter.chapter} of ${chapter.totalChapters}`
    : `Chapter ${chapter.chapter}`;

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <article>
          <header className="mb-8">
            <Link
              href={`/stories/${params.story}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors"
            >
              {chapter.storyTitle}
            </Link>
            <h1 className="text-3xl font-bold mt-1 mb-2 gaysparkles">{chapter.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{progressLabel}</span>
              <span>&middot;</span>
              <time>
                {new Date(chapter.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </div>
          </header>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MDXRemote source={chapter.content} />
          </div>

          <nav className="mt-12 pt-6 border-t flex items-center justify-between gap-4">
            <div className="flex-1">
              {chapter.prev !== null ? (
                <Link
                  href={`/stories/${params.story}/${chapter.prev}`}
                  className="button-link inline-flex items-center gap-1 py-3 px-5 text-base"
                >
                  &larr; Previous
                </Link>
              ) : (
                <span />
              )}
            </div>

            <Link
              href={`/stories/${params.story}`}
              className="button-link inline-flex items-center gap-1 py-3 px-5 text-base"
            >
              Index
            </Link>

            <div className="flex-1 text-right">
              {chapter.next !== null ? (
                <Link
                  href={`/stories/${params.story}/${chapter.next}`}
                  className="button-link inline-flex items-center gap-1 py-3 px-5 text-base"
                >
                  Next &rarr;
                </Link>
              ) : (
                <span />
              )}
            </div>
          </nav>
        </article>
      </div>
    </div>
  );
}
