import type { Field } from 'payload';

export const discoverabilityFields: Field[] = [
  {
    name: 'discoverability',
    type: 'group',
    admin: {
      description: 'Controls how this content is surfaced and distributed.',
    },
    fields: [
      {
        name: 'social_hook',
        type: 'text',
        admin: {
          description: 'One-liner for social sharing (Bluesky, etc.)',
        },
      },
      {
        name: 'search_summary',
        type: 'textarea',
        admin: {
          description: 'Short summary for search and AI indexing.',
        },
      },
      {
        name: 'canonical_path',
        type: 'text',
        admin: {
          description: 'Canonical URL path (e.g. /about)',
        },
      },
      {
        name: 'featured_on_start_here',
        type: 'checkbox',
        defaultValue: false,
        admin: {
          description: 'Include on the Start Here page.',
        },
      },
      {
        name: 'primaryCTA',
        type: 'group',
        fields: [
          { name: 'label', type: 'text' },
          { name: 'href', type: 'text' },
          { name: 'description', type: 'text' },
        ],
      },
      // audience_lanes and distribution_surfaces are managed via raw DB / admin tooling.
      // They use per-collection enum types created before Payload added the _value suffix
      // to enum names, and restoring them here would exceed PostgreSQL's 63-char identifier
      // limit for the version table enums. The data is preserved in the DB; these fields
      // are intentionally omitted from the Payload config to avoid dev-mode schema conflicts.
    ],
  },
];

export const metaFields: Field[] = [
  {
    name: 'meta',
    type: 'group',
    admin: {
      position: 'sidebar',
    },
    fields: [
      {
        name: 'title',
        type: 'text',
        admin: {
          description: 'Override the <title>. Defaults to the document title.',
        },
      },
      {
        name: 'description',
        type: 'textarea',
        admin: {
          description: 'Meta description for SEO.',
        },
      },
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        admin: {
          description: 'OG image for social sharing.',
        },
      },
      {
        name: 'keywords',
        type: 'text',
        admin: {
          description: 'Comma-separated keywords for SEO.',
        },
      },
    ],
  },
];

export const discoverabilityAndMetaFields: Field[] = [
  ...discoverabilityFields,
  ...metaFields,
];
