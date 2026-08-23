import { getProjectBySlug } from '@/lib/projects';
import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';
import { projectCategoryLabels } from '@/lib/project-model';
import { SITE_NAME } from '@/lib/site-brand';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = SITE_NAME;

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  const eyebrow = project?.category
    ? projectCategoryLabels[project.category] || project.category
    : null;
  return renderOgCard({
    eyebrow,
    title: project?.title || SITE_NAME,
    byline: project?.description || '',
  });
}
