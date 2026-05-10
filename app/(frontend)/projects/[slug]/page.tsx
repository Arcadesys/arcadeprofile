import { redirect } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

export default async function ProjectHubRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/projects/${slug}/00`);
}
