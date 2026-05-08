import type { Metadata } from 'next';
import { getAllProjectHubs } from '@/lib/payload';
import ProjectsBrowser from '@/app/components/ProjectsBrowser';
import SubscribeCTA from '@/app/components/SubscribeCTA';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects — The Arcades',
  description: 'Fiction, tools, experiments, and other things Austen is building.',
  openGraph: {
    title: 'Projects — The Arcades',
    description: 'Projects and creative work by Austen Tucker-Crowder.',
    url: 'https://thearcades.me/projects',
  },
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const projects = await getAllProjectHubs();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <h1 className="gaysparkles mb-3 text-center text-3xl font-bold">Projects</h1>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-[var(--fg-muted)]">
          Fiction, tools, experiments, media, and product links collected as project hubs.
        </p>

        <ProjectsBrowser projects={projects} initialCategory={params?.category} />

        <div style={{ maxWidth: '680px', margin: '3rem auto 0' }}>
          <SubscribeCTA
            source="projects"
            variant="compact"
            heading="Follow along as these ship"
            blurb="Subscribe and you'll see new chapters, tools, and experiments before they hit the public list."
            buttonLabel="Send updates"
          />
        </div>
      </div>
    </div>
  );
}
