import type { LabProject } from '@/data/lab-projects';

import styles from './lab.module.css';

type LabProjectLinksProps = {
  project: LabProject;
  description: string;
};

export function LabProjectLinks({ project, description }: LabProjectLinksProps) {
  return (
    <section className={styles.explore} aria-labelledby="explore-project">
      <h2 id="explore-project">Explore the project</h2>
      <p>{description}</p>
      <p className={styles.costNote}>{project.costNote}</p>
      <div className={styles.exploreLinks}>
        {project.liveUrl && project.liveLinkLabel ? (
          <a
            className={styles.externalLink}
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer"
          >
            {project.liveLinkLabel} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        {project.sourceUrl ? (
          <a
            className={`${styles.externalLink} ${project.liveUrl ? styles.externalLinkSecondary : ''}`}
            href={project.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {project.sourceLinkLabel ?? 'View public source on GitHub'}{' '}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
