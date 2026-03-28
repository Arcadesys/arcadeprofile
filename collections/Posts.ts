import type { CollectionConfig } from 'payload';

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'group', 'publishedDate', 'updatedAt'],
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        // Dynamic import of next/cache only when hook runs (in Next.js context)
        import('next/cache')
          .then(({ revalidatePath }) => {
            try {
              const slug = doc.slug as string;
              const group = doc.group as string;
              revalidatePath(`/blog/${slug}`);
              revalidatePath('/blog');
              revalidatePath('/writing');
              revalidatePath('/feed.xml');
              if (group) {
                revalidatePath(`/writing/group/${group}`);
              }
            } catch {
              // revalidatePath may fail outside request context
            }
          })
          .catch(() => {
            // next/cache not available (e.g. seed script)
          });
      },
    ],
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (!value && siblingData?.title) {
              return siblingData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'newsletterSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Whether this post has been sent to newsletter subscribers',
      },
    },
    {
      name: 'scheduledPublishDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'group',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Group/series slug (e.g. "the-singularity-log")',
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Order within group (lower = first)',
      },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Austen Tucker',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'newsletterHeading',
      type: 'text',
      admin: {
        description: 'Optional heading for inline newsletter CTA on this post',
      },
    },
    {
      name: 'newsletterDescription',
      type: 'textarea',
      admin: {
        description: 'Optional description for inline newsletter CTA on this post',
      },
    },
  ],
};
