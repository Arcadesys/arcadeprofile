import { notFound, permanentRedirect } from 'next/navigation';
import { buildPostUrl, getGroupBySlug, getPostBySlug } from '@/lib/blog';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function BlogPostRedirect({ params }: Props): Promise<never> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post?.group) notFound();

  const group = await getGroupBySlug(post.group);
  if (!group) notFound();

  const indexInGroup = group.posts.findIndex(p => p.slug === slug);
  if (indexInGroup < 0) notFound();

  permanentRedirect(buildPostUrl(group.slug, indexInGroup + 1));
}
