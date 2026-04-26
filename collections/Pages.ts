import type { CollectionConfig } from 'payload';
import { discoverabilityFields, metaFields } from './fields/discoverability';

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        import('next/cache')
          .then(({ revalidatePath }) => {
            try {
              const slug = doc.slug as string;
              revalidatePath(`/${slug}`);
            } catch {
              // revalidatePath may fail outside request context
            }
          })
          .catch(() => {});
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
      admin: {
        description: 'Short description for search and social cards.',
      },
    },
    {
      name: 'intro_label',
      type: 'text',
      admin: {
        description: 'Label shown above the intro box (e.g. "A note before we begin:")',
      },
    },
    {
      name: 'intro',
      type: 'richText',
      admin: {
        description: 'Optional intro box shown before main content.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'outro',
      type: 'richText',
      admin: {
        description: 'Optional closing section shown after main content.',
      },
    },
    {
      name: 'byline',
      type: 'text',
      admin: {
        description: 'Attribution line shown at the bottom of the outro box (e.g. "Kai, content writer for the Arcades")',
      },
    },
    {
      name: 'footer_text',
      type: 'text',
      admin: {
        description: 'Footer copy (e.g. copyright notice)',
      },
    },
    {
      name: 'footer_link_label',
      type: 'text',
    },
    {
      name: 'footer_link_href',
      type: 'text',
    },
    ...discoverabilityFields,
    ...metaFields,
  ],
};
