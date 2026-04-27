import Link from 'next/link';
import Image from 'next/image';
import { getAllDemos } from '@/lib/payload';
import type { Demo } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function DemosPage() {
  let demos: Demo[] = [];
  try {
    demos = await getAllDemos();
  } catch (error) {
    console.error('Failed to fetch demos:', error);
  }

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Demos</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Interactive experiments and live demos.</p>

        {demos.length === 0 ? (
          <p className="text-center text-gray-500">No demos yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {demos.map((demo) => (
              <article
                key={demo.slug}
                className="border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-6 flex flex-col"
              >
                {demo.image && (
                  <Image
                    src={demo.image}
                    alt={demo.title}
                    width={640}
                    height={320}
                    className="w-full h-40 object-cover rounded mb-4"
                  />
                )}
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {demo.title}
                </h2>
                {Array.isArray(demo.tags) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(demo.tags as string[]).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">{demo.description}</p>
                <Link href={`/demos/${demo.slug}`} className="button-link inline-block text-center">
                  Launch Demo &rarr;
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
