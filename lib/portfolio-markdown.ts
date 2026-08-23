import { readFileSync } from 'node:fs';
import path from 'node:path';

export function loadPortfolioMarkdown(slug: string): string {
  return readFileSync(
    path.join(process.cwd(), 'data', 'portfolio-content', `${slug}.md`),
    'utf8',
  ).trim();
}
