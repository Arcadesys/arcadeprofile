import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { buildStaticSitemapEntries } from '../lib/sitemap';
import { loadMarkdownBlog } from '../lib/blog';
import { buildGroupIntroUrl, buildPostUrl } from '../lib/post-url';
import { loadLabCaseStudies } from '../lib/lab-case-studies';
import { PRIVATE_ROUTE_REWRITES } from '../lib/private-routes';
import { SITE_URL } from '../lib/site-url';
import { getReadingCatalog } from '../lib/reading-catalog';

// Public pages intentionally absent from the sitemap. Keep this list explicit:
// no route-prefix fallback, token/thanks pages, APIs or soft-published pages.
const PUBLIC_EXTRAS = ['/start', '/subscribe', '/queercolumns', '/queercolumns/the-safe-door/notes'];

export function buildAnalyticsPublicPaths(now = new Date(), privateRoutes = PRIVATE_ROUTE_REWRITES): string[] {
  const { posts, groups } = loadMarkdownBlog({ now });
  const mff = readFileSync('app/(frontend)/mff/page.tsx', 'utf8');
  const paths = [
    ...buildStaticSitemapEntries(SITE_URL).map(({ url }) => new URL(url).pathname),
    ...groups.map(({ slug }) => buildGroupIntroUrl(slug)),
    ...posts.map(({ group, slug }) => buildPostUrl(group, slug)),
    ...loadLabCaseStudies().map(({ slug }) => `/lab/${slug}`),
    ...PUBLIC_EXTRAS,
    ...(/const MFF_PUBLIC = true;/.test(mff) ? ['/mff'] : []),
  ];
  const privatePaths = new Set([...Object.keys(privateRoutes), ...Object.values(privateRoutes)]);
  return [...new Set(paths)].filter((path) => !privatePaths.has(path)).sort();
}

/** Reporting cohort only; this never widens the collector's public allowlist. */
export async function buildAnalyticsReaderPaths(publicPaths = buildAnalyticsPublicPaths()): Promise<string[]> {
  const eligible = new Set(publicPaths);
  const catalog = await getReadingCatalog();
  return [...new Set(catalog.map((piece) => piece.canonicalPath))].filter((path) => eligible.has(path)).sort();
}

/** Only source-owned visible labels enter the browser; never visitor DOM text. */
export function buildMffAnalyticsLabels(sourceText = readFileSync('app/(frontend)/mff/page.tsx', 'utf8'), privateRoutes = PRIVATE_ROUTE_REWRITES) {
  if (!/const MFF_PUBLIC = true;/.test(sourceText) || [...Object.keys(privateRoutes), ...Object.values(privateRoutes)].includes('/mff')) return { section: [], heading: [], exhibit: [], label: [] };
  const source = ts.createSourceFile('page.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const labels = { section: new Set<string>(['Sources & further reading']), heading: new Set<string>(), exhibit: new Set<string>(), label: new Set<string>() };
  const decode = (text: string) => JSDOM.fragment(text).textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) ?? '';
  function text(node: ts.Node): string {
    if (ts.isJsxText(node)) return node.text;
    if (ts.isJsxExpression(node)) return node.expression && ts.isStringLiteral(node.expression) ? node.expression.text : '';
    if (ts.isJsxElement(node)) return node.children.map(text).join('');
    return '';
  }
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(source);
      const value = decode(text(node));
      if (value) {
        if (tag === 'h2') labels.section.add(value);
        if (tag === 'h3') labels.heading.add(value);
        if (tag === 'a' || tag === 'Link') labels.label.add(value);
      }
      if (tag === 'figcaption') {
        const first = node.children.find((child) => ts.isJsxElement(child) && child.openingElement.tagName.getText(source) === 'p');
        if (first) labels.exhibit.add(decode(text(first)));
      }
      if (tag === 'Callout') {
        const attributes = node.openingElement.attributes.properties;
        const link = attributes.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'link');
        if (link && ts.isJsxAttribute(link) && link.initializer && ts.isJsxExpression(link.initializer) && link.initializer.expression && ts.isObjectLiteralExpression(link.initializer.expression)) {
          const label = link.initializer.expression.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(source) === 'label');
          if (label && ts.isPropertyAssignment(label) && ts.isStringLiteral(label.initializer)) labels.label.add(decode(`${label.initializer.text} &rarr;`));
        }
        if (attributes.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'titleId')) {
          const title = attributes.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'title');
          if (title && ts.isJsxAttribute(title) && title.initializer && ts.isStringLiteral(title.initializer)) labels.section.add(decode(title.initializer.text));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return Object.fromEntries(Object.entries(labels).map(([key, values]) => [key, [...values].sort()])) as Record<keyof typeof labels, string[]>;
}
