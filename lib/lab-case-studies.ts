import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const nonEmptyText = z.string().trim().min(1);

export const DEFAULT_LAB_CASE_STUDIES_DIRECTORY = path.join(process.cwd(), 'content', 'lab');

const labCaseStudyFrontmatterSchema = z.object({
  slug: z.string().regex(SLUG_RE),
  title: nonEmptyText,
  description: nonEmptyText,
  lede: nonEmptyText,
  number: z.number().int().positive(),
  exploreDescription: nonEmptyText,
}).strict();

export type LabCaseStudy = z.infer<typeof labCaseStudyFrontmatterSchema> & {
  body: string;
  filePath: string;
};

/** Load source-owned Lab prose without mixing it into project/product metadata. */
export function loadLabCaseStudies(
  directory = DEFAULT_LAB_CASE_STUDIES_DIRECTORY,
): LabCaseStudy[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [];

  const seen = new Set<string>();
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const filePath = path.join(directory, entry.name);
      const parsed = matter(readFileSync(filePath, 'utf8'));
      const frontmatter = labCaseStudyFrontmatterSchema.safeParse(parsed.data);
      if (!frontmatter.success) {
        throw new Error(`Invalid Lab case study frontmatter in ${filePath}: ${z.prettifyError(frontmatter.error)}`);
      }
      const expectedSlug = entry.name.slice(0, -'.md'.length);
      if (frontmatter.data.slug !== expectedSlug) {
        throw new Error(`Lab case study ${filePath} has slug ${frontmatter.data.slug}; expected ${expectedSlug}.`);
      }
      if (!parsed.content.trim()) {
        throw new Error(`Lab case study ${filePath} must have a nonempty Markdown body.`);
      }
      if (seen.has(frontmatter.data.slug)) {
        throw new Error(`Duplicate Lab case study slug ${frontmatter.data.slug}.`);
      }
      seen.add(frontmatter.data.slug);
      return { ...frontmatter.data, body: parsed.content.trim(), filePath };
    })
    .sort((a, b) => a.number - b.number);
}

export function requireLabCaseStudy(slug: string): LabCaseStudy {
  const study = loadLabCaseStudies().find((candidate) => candidate.slug === slug);
  if (!study) throw new Error(`Unknown Lab case study: ${slug}`);
  return study;
}
