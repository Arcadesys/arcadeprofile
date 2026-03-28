import { redirect } from 'next/navigation';
import { getAllGroups } from '@/lib/blog';

export async function generateStaticParams() {
  try {
    const groups = await getAllGroups();
    return groups.map(g => ({ slug: g.slug }));
  } catch {
    return [];
  }
}

export default async function LegacyGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/writing/group/${slug}`);
}
