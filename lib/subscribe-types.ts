export const VALID_AUDIENCES = ['all', 'fiction', 'essays'] as const;
export type Audience = (typeof VALID_AUDIENCES)[number];

// Newsletter delivery cadence. `weekly` is the default — subscribers get one
// Sunday roundup with the past 7 days of posts. `perpost` is the opt-in for
// readers who want every installment as it lands (fiction Mon/Wed/Fri, essays
// Tue/Thu). Each cadence is a separate AC list per audience, so a single
// contact can move between cadences without losing their audience choice.
export const VALID_CADENCES = ['weekly', 'perpost'] as const;
export type Cadence = (typeof VALID_CADENCES)[number];
export const DEFAULT_CADENCE: Cadence = 'weekly';

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
