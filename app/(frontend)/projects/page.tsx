import { getAllProjectHubs } from '@/lib/payload';
import ProjectsBrowser from '@/app/components/ProjectsBrowser';

export const dynamic = 'force-dynamic';

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
      </div>
    </div>
  );
}
