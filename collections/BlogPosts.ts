import type { CollectionConfig } from 'payload'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'excerpt', type: 'textarea', required: true },
    { name: 'content', type: 'textarea', required: true },
    { name: 'group', type: 'relationship', relationTo: 'blog-groups' },
    { name: 'order', type: 'number' },
    { name: 'newsletterHeading', type: 'text' },
    { name: 'newsletterDescription', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Published', value: 'published' },
        { label: 'Sent', value: 'sent' },
      ],
    },
    { name: 'scheduledDate', type: 'date' },
    { name: 'tags', type: 'json' },
  ],
}
