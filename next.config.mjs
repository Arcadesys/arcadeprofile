import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dirname,
  outputFileTracingIncludes: {
    '/*': [
      './content/posts/**/*',
      './content/novels/**/*',
      './data/portfolio-content/**/*.md',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async headers() {
    // Report-only on the first cycle: the policy is published but the
    // browser only logs violations to its console rather than blocking.
    // Tune the directive list against real preview traffic, then promote
    // to enforcing Content-Security-Policy.
    const csp = [
      "default-src 'self'",
      // Next hydration currently requires inline script support.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.bunny.net",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://i.ytimg.com https://d226aj4ao1t61q.cloudfront.net",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.bunny.net",
      "connect-src 'self' https://vitals.vercel-insights.com",
      "frame-src 'self' https://www.youtube-nocookie.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Legacy fallback for browsers that don't honor CSP frame-ancestors.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
          },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/bibliography', destination: '/bookshelf', permanent: true },
      {
        source: '/projects/it-takes-a-zoo/it-takes-a-zoo',
        destination: '/projects/it-takes-a-zoo/it-takes-a-zoo-to-raise-the-child',
        permanent: true,
      },
      ...[
        'soft-reset-1-ninety-seconds',
        'soft-reset-2-the-belt',
        'soft-reset-3-exactly-enough',
        'soft-reset-4-third-stone-past-the-mailbox',
        'soft-reset-5-the-same-wall-two-different-dates',
        'soft-reset-6-then-what',
      ].map((segment) => ({
        source: `/projects/it-takes-a-zoo/${segment}`,
        destination: '/novels/it-takes-a-zoo/soft-reset',
        permanent: true,
      })),
      {
        source: '/betareader',
        destination: 'https://docs.google.com/forms/d/e/1FAIpQLSeOpGMaOMJwCqu9WHUpJvjlYvRIgV6vC3BqdstVJvssPlWeqg/viewform?usp=dialog',
        permanent: false,
      },
      // Résumé cutover (#287): the professional imprint owns the résumé.
      // PDF maps to PDF; nothing points a download at an HTML page.
      {
        source: '/resume',
        destination: 'https://work.thearcades.me/resume',
        permanent: true,
      },
      {
        source: '/resume/pdf',
        destination: 'https://work.thearcades.me/resume.pdf',
        permanent: true,
      },
      // Writing-site focus: the old Projects grid folds into the continuous blog.
      // Series pages (/projects/<series>) and every article URL stay as they are.
      // Temporary on purpose until the split settles; switch to permanent later.
      {
        source: '/projects',
        destination: '/latest',
        permanent: false,
      },
      // Builder work moved to work.thearcades.me (Nov 2026), at the same paths.
      // Temporary until the move settles; switch to permanent later.
      // The Telegram sticker publisher (/reaction-stickers/publish.html) and the
      // Furry History Board app (/lab/furry-history-board/app) stay here.
      ...['/toys', '/toys/:path*', '/lab', '/heinlein', '/heinlein/:path*', '/reaction-stickers', '/reaction-stickers/index.html'].map((source) => ({
        source,
        destination: `https://work.thearcades.me${source}`,
        permanent: false,
      })),
      {
        source: '/lab/:slug',
        destination: 'https://work.thearcades.me/lab/:slug',
        permanent: false,
      },
      {
        // The case-study PDFs did not move; send readers to the case study.
        source: '/lab/:slug/pdf',
        destination: 'https://work.thearcades.me/lab/:slug',
        permanent: false,
      },
      {
        source: '/DID',
        destination: '/did',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Keep MCP POSTs on the site origin; clients may reject cross-origin redirects.
        source: '/mcp',
        destination: 'https://arcades-public-mcp.vercel.app/mcp',
      },
      {
        source: '/lab/furry-history-board/app',
        destination: '/furry-history-board/index.html',
      },
    ];
  },
};

export default nextConfig;
