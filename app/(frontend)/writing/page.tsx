import { getAllGroups, type Group } from '@/lib/blog';
import ProjectList, { type Project } from '@/app/components/ProjectList';
import SubscribeForm from '@/app/components/SubscribeForm';

export const dynamic = 'force-dynamic';

export default async function WritingPage() {
  let groups: Group[] = [];
  try {
    groups = await getAllGroups();
  } catch (error) {
    console.error('Failed to fetch writing groups:', error);
  }

  const projects: Project[] = groups.map(g => ({
    slug: g.slug,
    title: g.title,
    description: g.description,
    tags: g.tags,
    itemCount: g.posts.length,
    itemLabel: 'essay',
    latestDate: g.posts[g.posts.length - 1]?.date,
    href: `/writing/group/${g.slug}`,
  }));

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Writing</h1>
        <p className="text-center text-[var(--fg-muted)] mb-8 max-w-xl mx-auto">
          Essays and nonfiction — organized by topic.
        </p>

        {projects.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)]">No projects yet. Check back soon!</p>
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
