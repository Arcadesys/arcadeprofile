import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';

type Hub = { title: string; description: string; path: '/stories' | '/essays' };

/**
 * Search titles for the two reading hubs. The layout template appends the site
 * name to `title`; social titles carry it explicitly because templates do not
 * apply to Open Graph or Twitter fields.
 */
export const STORIES_HUB: Hub = {
  title: 'Free Queer & Furry Speculative Fiction',
  description: 'Free short stories and a serial novel about queer found family, furry shapeshifters, and surviving a hypercapitalist world — read online or download the PDF editions.',
  path: '/stories',
};

export const ESSAYS_HUB: Hub = {
  title: 'Essays on AI, Creativity & Accessibility',
  description: 'Personal essays by Austen Tucker on trans and queer life, disability and accessibility, AI and creativity, and the craft of writing.',
  path: '/essays',
};

export function editorialHubMetadata({ title, description, path }: Hub): Metadata {
  const socialTitle = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', title: socialTitle, description, url: path, images: [DEFAULT_SOCIAL_IMAGE] },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [DEFAULT_SOCIAL_IMAGE.url] },
  };
}
