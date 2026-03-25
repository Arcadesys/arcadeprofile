import { redirect } from 'next/navigation';
import { getAllGroups } from '@/lib/blog';

export function generateStaticParams() {
  return getAllGroups().map(g => ({ slug: g.slug }));
}

export default function LegacyGroupPage({ params }: { params: { slug: string } }) {
  redirect(`/writing/group/${params.slug}`);
}
