import { getGroupBySlug } from '@/lib/blog';
import { getProjectBySlug } from '@/lib/projects';
import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { projectCategoryLabels } from '@/lib/project-model';
import { parsePostPartSegment } from '@/lib/post-url';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = SITE_NAME;

type Props = { params: Promise<{ slug: string; postSlug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug, postSlug } = await params;
  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  const partIndex = parsePostPartSegment(postSlug);
  const post = partIndex === null
    ? group?.posts.find((item) => item.slug === postSlug)
    : partIndex > 0
      ? group?.posts[partIndex - 1]
      : undefined;
  const eyebrow = project?.category
    ? projectCategoryLabels[project.category] || project.category
    : null;
  return renderOgCard({
    eyebrow,
    title: post?.meta?.title || post?.title || project?.title || SITE_NAME,
    byline: post ? project?.title || '' : '',
  });
}
