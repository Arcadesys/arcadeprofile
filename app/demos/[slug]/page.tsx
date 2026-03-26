import { notFound } from 'next/navigation';
import Link from 'next/link';
import { demos, getDemoBySlug } from '@/data/demos';

export function generateStaticParams() {
  return demos.map((d) => ({ slug: d.slug }));
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo) return notFound();

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b dark:border-gray-700">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{demo.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{demo.description}</p>
        </div>
        <Link href="/demos" className="button-link text-sm">
          &larr; All Demos
        </Link>
      </div>
      <iframe
        src={demo.embedUrl}
        className="flex-1 w-full border-0"
        title={demo.title}
        allow="camera; microphone; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
