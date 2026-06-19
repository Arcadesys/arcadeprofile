export const projectCategoryOptions = [
  { label: 'Fiction', value: 'fiction' },
  { label: 'Tools', value: 'tools' },
  { label: 'Experiments', value: 'experiments' },
  { label: 'Audio/Video', value: 'audio-video' },
  { label: 'Community', value: 'community' },
  { label: 'Writing', value: 'writing' },
] as const;

export type ProjectCategory = (typeof projectCategoryOptions)[number]['value'];

export const projectCategoryLabels: Record<string, string> = {
  fiction: 'Fiction',
  tools: 'Tools',
  experiments: 'Experiments',
  'audio-video': 'Audio/Video',
  community: 'Community',
  writing: 'Writing',
};

export const projectStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Available', value: 'available' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Archived', value: 'archived' },
] as const;

export type ProjectStatus = (typeof projectStatusOptions)[number]['value'];

export const projectStatusLabels: Record<string, string> = {
  active: 'Active',
  available: 'Available',
  'in-progress': 'In Progress',
  archived: 'Archived',
};

export const projectFormatOptions = [
  { label: 'Serial', value: 'serial' },
  { label: 'Collection', value: 'collection' },
] as const;

export type ProjectFormat = (typeof projectFormatOptions)[number]['value'];

export const projectResourceKindOptions = [
  { label: 'Post', value: 'post' },
  { label: 'Preview', value: 'preview' },
  { label: 'Buy', value: 'buy' },
  { label: 'Video', value: 'youtube' },
  { label: 'Audio', value: 'audio' },
  { label: 'Experiment', value: 'experiment' },
  { label: 'Repository', value: 'repo' },
  { label: 'Download', value: 'download' },
  { label: 'Other', value: 'other' },
] as const;

export type ProjectResourceKind = (typeof projectResourceKindOptions)[number]['value'];

export const projectCtaTypeOptions = [
  { label: 'Preview', value: 'preview' },
  { label: 'Buy', value: 'buy' },
  { label: 'Experiment', value: 'experiment' },
  { label: 'Video', value: 'youtube' },
  { label: 'Audio', value: 'audio' },
  { label: 'Repository', value: 'repo' },
  { label: 'Download', value: 'download' },
  { label: 'Other', value: 'other' },
] as const;

export const projectResourceLabels: Record<string, string> = {
  post: 'Post',
  preview: 'Preview',
  buy: 'Buy',
  youtube: 'Video',
  audio: 'Audio',
  experiment: 'Experiment',
  repo: 'Repository',
  download: 'Download',
  other: 'Link',
};
