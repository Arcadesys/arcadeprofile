import type { Field, FieldHook } from 'payload';

import { slugify } from '@/lib/utils';

const populateFromTitle: FieldHook = ({ value, siblingData }) => {
  if (!value && siblingData?.title) {
    return slugify(String(siblingData.title));
  }

  return value;
};

export function slugField(description?: string): Field {
  return {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    admin: {
      position: 'sidebar',
      ...(description ? { description } : {}),
    },
    hooks: {
      beforeValidate: [populateFromTitle],
    },
  };
}
