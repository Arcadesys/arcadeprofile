import { getAllStories } from '@/lib/stories';
import ProjectList, { type Project } from '@/app/components/ProjectList';
import SubscribeForm from '@/app/components/SubscribeForm';

export default function StoriesPage() {
  const stories = getAllStories();

  const projects: Project[] = stories.map(s => ({
    slug: s.slug,
    title: s.title,
    description: s.excerpt,
    tags: s.status === 'complete' ? ['complete'] : ['in-progress'],
    itemCount: s.chapterCount,
    itemLabel: 'chapter',
    latestDate: s.latestChapterDate,
    href: `/stories/${s.slug}`,
  }));

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Stories</h1>
        <p className="text-center text-[var(--fg-muted)] mb-8 max-w-xl mx-auto">
          Fiction — organized by project.
        </p>

        {projects.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)]">No stories yet. Check back soon!</p>
        ) : (
          <ProjectList projects={projects} />
        )}

        <div className="mt-12">
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
