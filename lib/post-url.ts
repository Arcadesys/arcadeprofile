const NUMERIC_PART_SEGMENT_RE = /^\d+$/;

export function partNum(n: number): string {
  return String(n).padStart(2, '0');
}

export function parsePostPartSegment(segment: string): number | null {
  if (!NUMERIC_PART_SEGMENT_RE.test(segment)) return null;
  const parsed = Number(segment);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Canonical permalink for a post within its group: /projects/<group>/<post-slug>. */
export function buildPostUrl(groupSlug: string, postSlug: string): string {
  return `/projects/${groupSlug}/${postSlug}`;
}

/** Canonical permalink for a group's intro page: /projects/<group>. */
export function buildGroupIntroUrl(groupSlug: string): string {
  return `/projects/${groupSlug}`;
}
