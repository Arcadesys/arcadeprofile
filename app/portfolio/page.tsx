import Link from 'next/link';
import { projects } from '@/data/projects';

export default function PortfolioPage() {
  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Portfolio</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Projects, experiments, and things I&apos;ve built.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {projects.map((project) => (
            <article
              key={project.title}
              className="border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-6 flex flex-col"
            >
              {project.image && (
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-40 object-cover rounded mb-4"
                />
              )}
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {project.title}
              </h2>
              {project.tags && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">{project.description}</p>
              {project.external ? (
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-link inline-block text-center"
                >
                  View Project &rarr;
                </a>
              ) : (
                <Link href={project.href} className="button-link inline-block text-center">
                  View Project &rarr;
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
