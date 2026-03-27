import type { CollectionConfig } from 'payload'

export const BlogGroups: CollectionConfig = {
  slug: 'blog-groups',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'tags', type: 'json' },
  ],
}
