import type { Field } from 'payload';

export const tagArrayField: Field = {
  name: 'tags',
  type: 'array',
  fields: [
    {
      name: 'tag',
      type: 'text',
      required: true,
    },
  ],
};

export const jsonTagsField: Field = {
  name: 'tags',
  type: 'json',
};
