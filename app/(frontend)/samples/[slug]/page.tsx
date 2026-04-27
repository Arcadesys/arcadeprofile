import { notFound, redirect } from 'next/navigation';
import { getSamplePostBySlug, getSamplePosts } from '@/lib/blog';

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const posts = await getSamplePosts();
    return posts.map(post => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export default async function SampleRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getSamplePostBySlug>> = null;
  try {
    post = await getSamplePostBySlug(slug);
  } catch (error) {
    console.error('Failed to fetch sample post:', error);
  }

  if (!post) {
    notFound();
  }

  redirect(`/blog/${post.slug}`);
}
