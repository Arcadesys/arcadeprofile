import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

export function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2 gaysparkles">{post.title}</h1>
            <time className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </header>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MDXRemote source={post.content} />
          </div>

          <div className="mt-8 pt-4 border-t">
            <Link href="/blog" className="button-link">
              &larr; Back to Blog
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
