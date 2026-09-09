import { COLLECTION, COLLECTION_PATH } from '@/lib/collection';
import { buildPostUrlMap, getAllPosts, type BlogPost, type PostLocation } from '@/lib/blog';
import { buildPostUrl } from '@/lib/post-url';
import { getAllProjectHubs, type ProjectHub } from '@/lib/payload';
import { ZOO_COLLECTION_PATH } from '@/lib/zoo-collection';

export type EditorialSection = 'fiction' | 'essays';

export interface EditorialCatalogPost {
  id: string | number;
  slug: string;
  title: string;
  description: string;
  date: string;
  href: string;
}

export interface EditorialCatalogGroup {
  slug: string;
  title: string;
  description: string;
  image?: string | null;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  canonicalChapterCollection?: boolean;
  href: string;
  posts: EditorialCatalogPost[];
  latestDate: string | undefined;
}

const fictionCoverFallbacks: Record<string, Pick<EditorialCatalogGroup, 'image' | 'imageAlt' | 'imageWidth' | 'imageHeight'>> = {
  'parts-of-the-whole': {
    image: '/images/stories/parts-of-the-whole.png',
    imageAlt: 'Cover art for Parts of the Whole.',
    imageWidth: 1024,
    imageHeight: 1536,
  },
  'short-stories': {
    image: '/images/stories/short-stories.jpg',
    imageAlt: 'Cover art for Short Stories.',
    imageWidth: 1054,
    imageHeight: 1492,
  },
};

export interface EditorialCatalog {
  fiction: EditorialCatalogGroup[];
  essays: EditorialCatalogGroup[];
  collection: typeof COLLECTION;
  collectionPath: typeof COLLECTION_PATH;
}

function sectionForCategory(category: ProjectHub['category']): EditorialSection | null {
  if (category === 'fiction') return 'fiction';
  if (category === 'writing') return 'essays';
  return null;
}

function dateMs(value: string | undefined): number {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Project categories are canonical across both the Markdown primary source and
 * the Payload rollback.  Keeping classification here means the two public
 * indexes cannot drift into separate editorial inventories.
 */
export function buildEditorialCatalog(
  hubs: readonly ProjectHub[],
  posts: readonly BlogPost[],
  urlMap: ReadonlyMap<string, PostLocation>,
): EditorialCatalog {
  const postsByGroup = new Map<string, BlogPost[]>();
  for (const post of posts) {
    if (!post.group || !urlMap.has(post.slug)) continue;
    const groupPosts = postsByGroup.get(post.group) ?? [];
    groupPosts.push(post);
    postsByGroup.set(post.group, groupPosts);
  }

  const catalog: Pick<EditorialCatalog, 'fiction' | 'essays'> = {
    fiction: [],
    essays: [],
  };

  for (const hub of hubs) {
    const section = sectionForCategory(hub.category);
    if (!section) continue;

    const groupPosts = (postsByGroup.get(hub.slug) ?? [])
      .slice()
      .sort((a, b) => dateMs(b.date) - dateMs(a.date));
    if (groupPosts.length === 0) continue;

    const normalizedPosts = groupPosts.map((post) => {
      const location = urlMap.get(post.slug)!;
      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.excerpt,
        date: post.date,
        href: buildPostUrl(location.groupSlug, post.slug),
      };
    });

    const fallbackCover = section === 'fiction' ? fictionCoverFallbacks[hub.slug] : undefined;

    catalog[section].push({
      slug: hub.slug,
      title: hub.title,
      description: hub.description,
      image: fallbackCover?.image ?? hub.image,
      imageAlt: fallbackCover?.imageAlt ?? (hub.image ? `Cover art for ${hub.title}.` : undefined),
      imageWidth: fallbackCover?.imageWidth ?? (hub.image ? 1650 : undefined),
      imageHeight: fallbackCover?.imageHeight ?? (hub.image ? 2550 : undefined),
      canonicalChapterCollection: hub.slug === 'it-takes-a-zoo',
      href: hub.slug === 'it-takes-a-zoo' ? ZOO_COLLECTION_PATH : hub.href,
      posts: normalizedPosts,
      latestDate: normalizedPosts[0]?.date,
    });
  }

  for (const section of [catalog.fiction, catalog.essays]) {
    section.sort((a, b) => dateMs(b.latestDate) - dateMs(a.latestDate) || a.title.localeCompare(b.title));
  }

  return {
    ...catalog,
    collection: COLLECTION,
    collectionPath: COLLECTION_PATH,
  };
}

export async function getEditorialCatalog(): Promise<EditorialCatalog> {
  // Keep Payload initialization sequential: its client can race when two
  // independent loaders initialise on a cold start.
  const hubs = await getAllProjectHubs();
  const posts = await getAllPosts();
  const urlMap = await buildPostUrlMap();
  return buildEditorialCatalog(hubs, posts, urlMap);
}
