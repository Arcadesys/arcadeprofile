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
  'project-hub',
  'store-top',
  'store-bottom',
] as const;
export type Source = (typeof VALID_SOURCES)[number];

export const VALID_MAGNETS = ['story'] as const;
export type Magnet = (typeof VALID_MAGNETS)[number];
