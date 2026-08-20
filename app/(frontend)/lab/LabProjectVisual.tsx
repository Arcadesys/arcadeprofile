import Image from 'next/image';

import type { LabProject } from '@/data/lab-projects';

import styles from './lab.module.css';

type LabProjectVisualProps = {
  project: LabProject;
  hero?: boolean;
  priority?: boolean;
};

export function LabProjectVisual({
  project,
  hero = false,
  priority = false,
}: LabProjectVisualProps) {
  return (
    <figure className={hero ? styles.heroVisual : styles.visual}>
      {project.screenshot ? (
        <Image
          className={styles.visualImage}
          src={project.screenshot.src}
          alt={project.screenshot.alt}
          width={project.screenshot.width}
          height={project.screenshot.height}
          sizes={hero ? '(max-width: 760px) calc(100vw - 2rem), 880px' : '(max-width: 760px) calc(100vw - 2rem), 560px'}
          priority={priority}
        />
      ) : (
        <div
          className={styles.visualFrame}
          role="img"
          aria-label={`${project.title} project visual. ${project.visualDescription}. A genuine application screenshot has not been added yet.`}
        >
          <div>
            <span className={styles.visualLabel}>{project.visualEyebrow}</span>
            <strong className={styles.visualTitle}>{project.title}</strong>
            <span className={styles.visualNote}>{project.visualDescription}</span>
          </div>
        </div>
      )}
      <figcaption>
        {project.screenshot
          ? project.screenshot.alt
          : 'Honest placeholder: this labeled product summary is not a simulated application screenshot.'}
      </figcaption>
    </figure>
  );
}
