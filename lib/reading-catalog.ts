import { getAllGroups, getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { COLLECTION, COLLECTION_PATH, COLLECTION_TITLE } from '@/lib/collection';
import { PORTFOLIO_WORKS } from '@/lib/portfolio';
import { getAllProjectHubs } from '@/lib/projects';
import { buildGroupIntroUrl, buildPostUrl } from '@/lib/post-url';
import { ZOO_CHAPTERS, ZOO_COLLECTION_PATH, ZOO_COLLECTION_TITLE } from '@/lib/zoo-collection';
import type { ReadingPiece } from './reading-continuity';

const EDITION_BY_PATH: Record<string, string> = {
  '/portfolio/gallery-view': 'gallery-view',
  '/novels/it-takes-a-zoo/gallery-view': 'gallery-view',
};

const CURATED_PATHS: Record<string, readonly string[]> = {
  '/novels/it-takes-a-zoo/cold-boot': ['/this-is-what-i-do-for-fun/carl'],
  '/this-is-what-i-do-for-fun/parts-of-the-whole': ['/portfolio/gallery-view'],
};

function enrich(piece: ReadingPiece): ReadingPiece {
  return { ...piece, editionOf: EDITION_BY_PATH[piece.canonicalPath], curatedRelatedPaths: CURATED_PATHS[piece.canonicalPath] };
}

/** The public cross-family catalog used by every long-form reader and resume UI. */
export async function getReadingCatalog(): Promise<ReadingPiece[]> {
  const [posts, groups, locations, projects] = await Promise.all([getAllPosts(), getAllGroups(), buildPostUrlMap(), getAllProjectHubs()]);
  const groupBySlug = new Map(groups.map((group) => [group.slug, group]));
  const projectBySlug = new Map(projects.map((project) => [project.slug, project]));
  const projectPieces = posts.flatMap((post) => {
    const location = locations.get(post.slug);
    if (!location) return [];
    const project = projectBySlug.get(location.groupSlug);
    const group = groupBySlug.get(location.groupSlug);
    const isSerial = project?.format === 'serial';
    return [enrich({
      canonicalPath: buildPostUrl(location.groupSlug, post.slug), title: post.title,
      contentType: project?.category === 'fiction' ? 'fiction' : 'essay', tags: post.tags, publishedAt: post.date,
      collection: isSerial && group ? { id: `project:${location.groupSlug}`, title: project?.title ?? group.title, path: buildGroupIntroUrl(location.groupSlug), position: location.partIndex, total: group.posts.length, status: project?.status === 'active' ? 'active' : 'complete' } : undefined,
    })];
  });
  const collectionPieces = COLLECTION.filter((story) => story.markdownBody).map((story, index, readable) => enrich({
    canonicalPath: `${COLLECTION_PATH}/${story.slug}`, title: story.title, contentType: 'fiction',
    collection: { id: 'this-is-what-i-do-for-fun', title: COLLECTION_TITLE, path: COLLECTION_PATH, position: index + 1, total: readable.length, status: 'complete' },
  }));
  const portfolioPieces = PORTFOLIO_WORKS.map((work) => enrich({ canonicalPath: `/portfolio/${work.slug}`, title: work.title, contentType: 'fiction' }));
  const zooPieces = ZOO_CHAPTERS.map((chapter) => enrich({
    canonicalPath: chapter.path, title: chapter.title, contentType: 'chapter',
    collection: { id: 'it-takes-a-zoo', title: ZOO_COLLECTION_TITLE, path: ZOO_COLLECTION_PATH, position: chapter.order, total: ZOO_CHAPTERS.length, status: 'complete' },
  }));
  return [...projectPieces, ...collectionPieces, ...portfolioPieces, ...zooPieces];
}
