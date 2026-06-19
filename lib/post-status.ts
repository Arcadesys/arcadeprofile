export const postStatusValues = ['draft', 'scheduled', 'published', 'sent'] as const;
export type PostStatus = (typeof postStatusValues)[number];

export const prePublicPostStatuses = ['draft', 'scheduled'] as const satisfies readonly PostStatus[];
export type PrePublicPostStatus = (typeof prePublicPostStatuses)[number];

export const publicPostStatuses = ['published', 'sent'] as const satisfies readonly PostStatus[];
export type PublicPostStatus = (typeof publicPostStatuses)[number];

export const postStatusOptions = [
  { label: 'Not queued', value: 'draft' },
  { label: 'Scheduled publish', value: 'scheduled' },
  { label: 'Published by scheduler', value: 'published' },
  { label: 'Newsletter sent', value: 'sent' },
] satisfies Array<{ label: string; value: PostStatus }>;

const publicPostStatusSet: ReadonlySet<string> = new Set(publicPostStatuses);

export function isPublicPostStatus(value: unknown): value is PublicPostStatus {
  return typeof value === 'string' && publicPostStatusSet.has(value);
}

export function isPrePublicOrMissingPostStatus(value: unknown): value is PrePublicPostStatus | null | undefined {
  return value == null || value === 'draft' || value === 'scheduled';
}

export function prePublicOrMissingPostStatusClauses(): Array<{
  publish_status: { equals: PrePublicPostStatus | null };
}> {
  return [
    { publish_status: { equals: 'draft' } },
    { publish_status: { equals: 'scheduled' } },
    { publish_status: { equals: null } },
  ];
}

export function draftOrMissingPostStatusClauses(): Array<{
  publish_status: { equals: 'draft' | null };
}> {
  return [
    { publish_status: { equals: 'draft' } },
    { publish_status: { equals: null } },
  ];
}

export function publicPostStatusWhere(): { in: PublicPostStatus[] } {
  return { in: [...publicPostStatuses] };
}
