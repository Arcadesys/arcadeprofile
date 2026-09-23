import { SITE_TITLE_DEFAULT } from '@/lib/site-brand';

/** A legible site card for public pages without dedicated artwork. */
export const DEFAULT_SOCIAL_IMAGE = {
  url: '/social-card',
  width: 1200,
  height: 630,
  alt: SITE_TITLE_DEFAULT,
} as const;
