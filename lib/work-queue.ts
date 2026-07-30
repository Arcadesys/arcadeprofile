export const workItemTypes = ['epic', 'story', 'task'] as const;
export type WorkItemType = (typeof workItemTypes)[number];

export const workItemStatuses = ['inbox', 'ready', 'running', 'review', 'done'] as const;
export type WorkItemStatus = (typeof workItemStatuses)[number];

export const workItemOwners = ['human', 'ai'] as const;
export type WorkItemOwner = (typeof workItemOwners)[number];

export const workItemStatusLabels: Record<WorkItemStatus, string> = {
  inbox: 'Inbox',
  ready: 'Ready',
  running: 'Running',
  review: 'Human Review',
  done: 'Done',
};

export const workItemTypeLabels: Record<WorkItemType, string> = {
  epic: 'Epic',
  story: 'Story',
  task: 'Task',
};

export const workQueueWipLimits: Partial<Record<WorkItemStatus, number>> = {
  ready: 5,
  running: 3,
  review: 5,
};

export function isWorkItemType(value: unknown): value is WorkItemType {
  return typeof value === 'string' && workItemTypes.includes(value as WorkItemType);
}

export function isWorkItemStatus(value: unknown): value is WorkItemStatus {
  return typeof value === 'string' && workItemStatuses.includes(value as WorkItemStatus);
}

export function isWorkItemOwner(value: unknown): value is WorkItemOwner {
  return typeof value === 'string' && workItemOwners.includes(value as WorkItemOwner);
}

export function requiredParentType(type: WorkItemType): WorkItemType | null {
  if (type === 'story') return 'epic';
  if (type === 'task') return 'story';
  return null;
}

export function relationshipId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === 'object' && 'id' in value) {
    return relationshipId((value as { id: unknown }).id);
  }
  return null;
}

export interface WorkItemInput {
  title: string;
  type: WorkItemType;
  parent?: number | null;
  definitionOfDone?: string;
  owner?: WorkItemOwner;
  budgetUsd?: number;
  status?: WorkItemStatus;
  position?: number;
}

function optionalNonNegativeNumber(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
  return value;
}

export function parseWorkItemInput(
  value: unknown,
  options: { partial?: boolean } = {},
): Partial<WorkItemInput> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Work item input must be an object.');
  }
  const input = value as Record<string, unknown>;
  const result: Partial<WorkItemInput> = {};

  if (!options.partial || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new Error('title is required.');
    }
    result.title = input.title.trim();
  }

  if (!options.partial || input.type !== undefined) {
    if (!isWorkItemType(input.type)) {
      throw new Error(`type must be one of: ${workItemTypes.join(', ')}.`);
    }
    result.type = input.type;
  }

  if (input.parent !== undefined || input.parentId !== undefined) {
    const rawParent = input.parent ?? input.parentId;
    if (rawParent === null || rawParent === '') {
      result.parent = null;
    } else {
      const parent = relationshipId(rawParent);
      if (parent === null) throw new Error('parentId must be a valid work item id.');
      result.parent = parent;
    }
  }

  if (input.definitionOfDone !== undefined) {
    if (typeof input.definitionOfDone !== 'string') {
      throw new Error('definitionOfDone must be text.');
    }
    result.definitionOfDone = input.definitionOfDone.trim();
  }

  if (input.owner !== undefined) {
    if (!isWorkItemOwner(input.owner)) {
      throw new Error(`owner must be one of: ${workItemOwners.join(', ')}.`);
    }
    result.owner = input.owner;
  }

  if (input.status !== undefined) {
    if (!isWorkItemStatus(input.status)) {
      throw new Error(`status must be one of: ${workItemStatuses.join(', ')}.`);
    }
    result.status = input.status;
  }

  result.budgetUsd = optionalNonNegativeNumber(input.budgetUsd, 'budgetUsd');
  result.position = optionalNonNegativeNumber(input.position, 'position');

  return Object.fromEntries(
    Object.entries(result).filter(([, fieldValue]) => fieldValue !== undefined),
  );
}
