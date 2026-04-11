import Link from 'next/link';
import { getAllProjects } from '@/lib/payload';

export const dynamic = 'force-dynamic';

function ProjectCard({ project }: { project: { id: number; title: string; description: string; image?: string | null; href: string; external?: boolean | null; tags?: unknown } }) {
  const tags = Array.isArray(project.tags) ? (project.tags as string[]) : [];

  const content = (
    <>
      {project.image && (
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-40 object-cover rounded mb-4"
        />
      )}
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{project.title}</h2>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="text-gray-600 dark:text-gray-300">{project.description}</p>
      <span className="button-link inline-block mt-4">
        {project.external ? 'View Project ↗' : 'View Project →'}
      </span>
    </>
  );

  const className = "block border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-6";

  if (project.external) {
    return (
      <a href={project.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={project.href} className={className}>
      {content}
    </Link>
  );
}

export default async function PortfolioPage() {
  const projects = await getAllProjects();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Portfolio</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Projects and experiments.</p>

        {projects.length === 0 ? (
          <p className="text-center text-gray-500">No projects yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
