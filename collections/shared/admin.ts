import type { CollectionConfig } from 'payload';

type AdminConfig = NonNullable<CollectionConfig['admin']>;

export const adminGroups = {
  content: 'Content',
  library: 'Library',
  publishing: 'Publishing',
  audience: 'Audience',
  system: 'System',
} as const;

export function titledAdmin(
  group: (typeof adminGroups)[keyof typeof adminGroups],
  defaultColumns?: string[],
): AdminConfig {
  return {
    group,
    useAsTitle: 'title',
    ...(defaultColumns ? { defaultColumns } : {}),
  };
}
