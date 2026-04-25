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
  const post = await getSamplePostBySlug(slug);

  if (!post) {
    notFound();
  }

  redirect(`/blog/${post.slug}`);
}
