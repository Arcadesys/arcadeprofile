import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-8 text-center gaysparkles">Blog</h1>

        {posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <article key={post.slug} className="border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-6">
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <time className="text-sm text-gray-500 dark:text-gray-400 mb-3 block">
                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                <p className="text-gray-600 dark:text-gray-300 mb-3">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="button-link inline-block">
                  Read more
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
