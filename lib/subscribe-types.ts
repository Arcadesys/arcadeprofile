export const VALID_AUDIENCES = ['all', 'fiction', 'essays', 'lab'] as const;
export type Audience = (typeof VALID_AUDIENCES)[number];

export const VALID_SOURCES = [
  'home-hero',
  'home-bottom',
  'footer',
  'latest',
  'projects',
  'bio',
  'subscribe-page',
  'post',
  'post-end',
  'zoo-chapter-end',
  'zoo-collection',
  'collection-story-end',
  'portfolio-piece-end',
  'lab-case-study-end',
  'project-hub',
  'store-top',
  'store-bottom',
] as const;
export type Source = (typeof VALID_SOURCES)[number];

export const VALID_MAGNETS = ['story', 'it-takes-a-zoo-complete'] as const;
export type Magnet = (typeof VALID_MAGNETS)[number];

export const VALID_UPDATE_MODES = ['replace', 'add'] as const;
export type SubscriptionUpdateMode = (typeof VALID_UPDATE_MODES)[number];
