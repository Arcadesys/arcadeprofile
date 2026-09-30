import { buildPostDiscoveryUrl } from '@/lib/post-canonical';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import { getAllProjectHubs, type ProjectHub } from '@/lib/projects';
import { getAllPosts, buildPostUrlMap, type BlogPost } from '@/lib/blog';
import { buildGroupIntroUrl } from '@/lib/post-url';
import ProjectsIndex, {
  type IndexEntry,
  type PulseItem,
  type TypeLetter,
  type FeedItem,
} from '@/app/components/ProjectsIndex';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { ZOO_COLLECTION_DESCRIPTION, ZOO_COLLECTION_PATH, ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Fiction, tools, experiments, and other things Austen is building.',
  alternates: { canonical: '/projects' },
  openGraph: {
    type: 'website',
    title: `Projects | ${SITE_NAME}`,
    description: 'Projects and creative work by Austen Tucker-Crowder.',
    url: '/projects',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Projects | ${SITE_NAME}`,
    description: 'Projects and creative work by Austen Tucker-Crowder.',
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

const ACTIVE_DAYS = 14;
const PULSE_DAYS = 7;
const PULSE_FALLBACK_DAYS = 14;
const PULSE_MAX = 6;
const FEED_MAX = 3;

export default async function ProjectsPage() {
  const [hubs, posts, urlMap] = await Promise.all([
    getAllProjectHubs(),
    getAllPosts(),
    buildPostUrlMap(),
  ]);

  const now = Date.now();
  const postsByGroup = new Map<string, BlogPost[]>();
  for (const p of posts) {
    if (!p.group) continue;
    const list = postsByGroup.get(p.group) ?? [];
    list.push(p);
    postsByGroup.set(p.group, list);
  }
  for (const list of postsByGroup.values()) {
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const hubBySlug = new Map(hubs.map((h) => [h.slug, h]));

  const entries: IndexEntry[] = hubs.map((hub) => {
    const isZooCollection = hub.slug === 'it-takes-a-zoo';
    const groupPosts = postsByGroup.get(hub.slug) ?? [];
    const totalPosts = groupPosts.length;
    const newest = groupPosts[0];
    const newestMs = newest ? new Date(newest.date).getTime() : 0;
    const ageDays = newest ? (now - newestMs) / 86400000 : Infinity;

    let bucket: IndexEntry['bucket'];
    if (hub.status === 'archived') bucket = 'quiet';
    else if (totalPosts === 0) bucket = 'quiet';
    else if (ageDays <= ACTIVE_DAYS) bucket = 'active';
    else bucket = 'recent';

    const typeLetter = categoryToLetter(hub.category);
    const cadence = !isZooCollection && bucket === 'active' ? cadenceFor(hub.category) : undefined;

    const feedSource = bucket === 'active' ? groupPosts.slice(0, FEED_MAX) : [];
    const feed: FeedItem[] = feedSource.map((p) => toFeedItem(p, hub));

    let latestPost: FeedItem | undefined;
    if (newest && bucket === 'recent') {
      latestPost = toFeedItem(newest, hub);
    }

    const metaTags = isZooCollection
      ? [`${ZOO_FEATURED_COLLECTION.chapterCount} chapters + opening poem`]
      : buildMetaTags(hub, totalPosts);

    const latestSortKey = newestMs || dateToMs(hub.updatedAt) || dateToMs(hub.createdAt);

    return {
      slug: hub.slug,
      title: hub.title,
      description: isZooCollection ? ZOO_COLLECTION_DESCRIPTION : hub.description,
      href: isZooCollection ? ZOO_COLLECTION_PATH : buildGroupIntroUrl(hub.slug),
      image: hub.image ?? null,
      category: hub.category ?? null,
      status: hub.status ?? null,
      bucket,
      typeLetter,
      metaTags,
      cadence,
      totalPosts,
      feed,
      latestPost: isZooCollection ? undefined : latestPost,
      primaryActionLabel: isZooCollection ? `Read the ${ZOO_FEATURED_COLLECTION.chapterCount}-chapter collection` : undefined,
      latestSortKey,
    };
  });

  const pulseWindowMs = PULSE_DAYS * 86400000;
  let pulseSource = posts.filter(
    (p) => p.group && hubBySlug.has(p.group) && now - new Date(p.date).getTime() <= pulseWindowMs,
  );
  if (pulseSource.length < 3) {
    const fallbackMs = PULSE_FALLBACK_DAYS * 86400000;
    pulseSource = posts.filter(
      (p) => p.group && hubBySlug.has(p.group) && now - new Date(p.date).getTime() <= fallbackMs,
    );
  }
  const pulse: PulseItem[] = pulseSource.slice(0, PULSE_MAX).map((p) => {
    const hub = hubBySlug.get(p.group!)!;
    const loc = urlMap.get(p.slug);
    const href = loc ? buildPostDiscoveryUrl(loc.groupSlug, p.slug) : buildGroupIntroUrl(hub.slug);
    return {
      slug: p.slug,
      title: p.title,
      href,
      groupTitle: pulseGroupShort(hub.title),
      groupHref: buildGroupIntroUrl(hub.slug),
      date: p.date,
      relative: relativeShort(p.date, now),
    };
  });

  const weekCount = posts.filter(
    (p) => p.group && hubBySlug.has(p.group) && now - new Date(p.date).getTime() <= PULSE_DAYS * 86400000,
  ).length;

  return (
    <ProjectsIndex
      entries={entries}
      pulse={pulse}
      weekCount={weekCount}
      writingNow={{
        title: ZOO_FEATURED_COLLECTION.title,
        href: ZOO_FEATURED_COLLECTION.path,
        chapterCount: ZOO_FEATURED_COLLECTION.chapterCount,
        availability: ZOO_FEATURED_COLLECTION.availability,
      }}
    />
  );

  function toFeedItem(post: BlogPost, hub: ProjectHub): FeedItem {
    const loc = urlMap.get(post.slug);
    const href = loc ? buildPostDiscoveryUrl(loc.groupSlug, post.slug) : buildGroupIntroUrl(hub.slug);
    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      href,
      partLabel: partLabelFor(hub.category, loc?.partIndex),
    };
  }
}

function categoryToLetter(category?: string | null): TypeLetter {
  switch (category) {
    case 'fiction': return 'f';
    case 'writing': return 'e';
    case 'tools': return 't';
    case 'experiments': return 't';
    case 'audio-video': return 'a';
    case 'community': return 'c';
    default: return 'c';
  }
}

function cadenceFor(category?: string | null): string | undefined {
  switch (category) {
    case 'fiction': return 'mon · wed · fri';
    case 'writing': return 'tue · thu';
    default: return 'recent';
  }
}

function buildMetaTags(hub: ProjectHub, totalPosts: number): string[] {
  const tags: string[] = [];
  const noun = countNoun(hub.category, totalPosts);
  if (totalPosts > 0) tags.push(`${totalPosts} ${noun}`);
  if (hub.status && hub.status !== 'active' && hub.status !== 'archived') {
    tags.push(hub.status.replace(/-/g, ' '));
  }
  return tags;
}

function countNoun(category: string | null | undefined, n: number): string {
  switch (category) {
    case 'fiction': return n === 1 ? 'chapter' : 'chapters';
    case 'writing': return n === 1 ? 'essay' : 'essays';
    case 'audio-video': return n === 1 ? 'piece' : 'pieces';
    case 'tools':
    case 'experiments': return n === 1 ? 'release' : 'releases';
    default: return n === 1 ? 'post' : 'posts';
  }
}

function partLabelFor(category: string | null | undefined, partIndex?: number): string | undefined {
  if (!partIndex) return undefined;
  if (category === 'fiction') return `ch. ${partIndex}`;
  return undefined;
}

function pulseGroupShort(title: string): string {
  const trimmed = title.replace(/^The\s+/i, '');
  if (trimmed.length <= 18) return trimmed;
  return trimmed.slice(0, 16).trim() + '…';
}

function relativeShort(date: string, now: number): string {
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return '';
  const days = Math.max(0, Math.floor((now - d) / 86400000));
  if (days < 1) return 'today';
  return `${days}d`;
}

function dateToMs(date?: string): number {
  if (!date) return 0;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
