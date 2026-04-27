import { redirect } from 'next/navigation';

export default async function PreviewRedirectPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  redirect(`/samples/${bookId}`);
}
