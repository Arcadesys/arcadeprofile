export interface OrderedPostLike {
  order?: number | null;
  date?: string | null;
  publishedDate?: string | null;
}

function postDateMs(post: OrderedPostLike): number {
  const value = post.date ?? post.publishedDate;
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function comparePostsByGroupOrder(a: OrderedPostLike, b: OrderedPostLike): number {
  const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
  const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return postDateMs(a) - postDateMs(b);
}

export function latestPostDateMs(posts: OrderedPostLike[]): number {
  return posts.reduce((latest, post) => Math.max(latest, postDateMs(post)), 0);
}
