import type {
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from 'payload';

import {
  relationshipId,
  requiredParentType,
  workItemOwners,
  workItemStatuses,
  workItemTypeLabels,
  workItemTypes,
  type WorkItemType,
} from '@/lib/work-queue';
import { authenticatedAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

const validateHierarchy: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;

  const type = (data.type ?? originalDoc?.type) as WorkItemType | undefined;
  if (!type || !workItemTypes.includes(type)) return data;

  const parentValue = data.parent !== undefined ? data.parent : originalDoc?.parent;
  const parentId = relationshipId(parentValue);
  const expectedParentType = requiredParentType(type);

  if (!expectedParentType) {
    data.parent = null;
    return data;
  }

  if (parentId === null) {
    throw new Error(`${workItemTypeLabels[type]} items require a parent ${expectedParentType}.`);
  }

  const parent = await req.payload.findByID({
    collection: 'work-items',
    id: parentId,
    depth: 0,
    overrideAccess: true,
  });

  if (parent.type !== expectedParentType) {
    throw new Error(
      `${workItemTypeLabels[type]} items must belong to a ${workItemTypeLabels[expectedParentType]}.`,
    );
  }

  return data;
};

const preventDeletingParents: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const children = await req.payload.count({
    collection: 'work-items',
    where: { parent: { equals: id } },
    overrideAccess: true,
  });
  if (children.totalDocs > 0) {
    throw new Error('Move or delete this item’s children before deleting it.');
  }
};

export const WorkItems: CollectionConfig = {
  slug: 'work-items',
  access: authenticatedAccess,
  admin: titledAdmin(adminGroups.system, [
    'title',
    'type',
    'status',
    'owner',
    'budgetUsd',
    'updatedAt',
  ]),
  defaultSort: ['status', 'position', 'createdAt'],
  hooks: {
    beforeValidate: [validateHierarchy],
    beforeDelete: [preventDeletingParents],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: workItemTypes.map((value) => ({
        label: workItemTypeLabels[value],
        value,
      })),
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'work-items',
      index: true,
      admin: {
        description: 'Stories belong to epics. Tasks belong to stories.',
      },
    },
    {
      name: 'definitionOfDone',
      type: 'textarea',
      admin: {
        description: 'The testable condition that makes this item complete.',
      },
    },
    {
      name: 'owner',
      type: 'select',
      required: true,
      defaultValue: 'human',
      options: workItemOwners.map((value) => ({
        label: value === 'ai' ? 'AI' : 'Human',
        value,
      })),
    },
    {
      name: 'budgetUsd',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        description: 'Maximum approved AI spend for this work item.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'inbox',
      options: workItemStatuses.map((value) => ({
        label:
          value === 'review'
            ? 'Human Review'
            : value.charAt(0).toUpperCase() + value.slice(1),
        value,
      })),
    },
    {
      name: 'position',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        description: 'Sort position inside the current Kanban column.',
      },
    },
  ],
};
