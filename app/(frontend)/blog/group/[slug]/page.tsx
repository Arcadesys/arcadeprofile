import { redirect } from 'next/navigation';
import { getAllGroups } from '@/lib/mdx';

export function generateStaticParams() {
  return getAllGroups().map(g => ({ slug: g.slug }));
}

export default async function LegacyGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/writing/group/${slug}`);
}
