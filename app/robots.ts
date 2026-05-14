import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/preview/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
