import { withPayload } from '@payloadcms/next/withPayload';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dirname,
  // Keep Lexical (and its @lexical/* family) externalized on the server so
  // Payload's BlocksFeature uses a single class hierarchy. Without this,
  // Next bundles different copies for different import chains, which trips
  // Lexical's "ServerBlockNode does not subclass LexicalNode" check.
  serverExternalPackages: [
    'lexical',
    '@lexical/headless',
    '@lexical/react',
    '@lexical/utils',
    '@lexical/markdown',
    '@lexical/list',
    '@lexical/rich-text',
    '@lexical/link',
    '@lexical/selection',
    '@lexical/clipboard',
    '@lexical/code',
    '@lexical/hashtag',
    '@lexical/history',
    '@lexical/html',
    '@lexical/mark',
    '@lexical/offset',
    '@lexical/overflow',
    '@lexical/plain-text',
    '@lexical/table',
    '@lexical/text',
    '@lexical/yjs',
  ],
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  webpack: (config) => {
    // Suppress missing optional dep warning from json-schema-to-typescript (via Payload)
    config.resolve.fallback = { ...config.resolve.fallback, 'cli-color': false };
    return config;
  },
  async headers() {
    // Report-only on the first cycle: the policy is published but the
    // browser only logs violations to its console rather than blocking.
    // Tune the directive list against real preview traffic, then promote
    // to enforcing Content-Security-Policy.
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' / 'unsafe-eval' permit Payload admin and Next's
      // hydration shims. Tighten with nonces once we measure breakage.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://atuckercrowder.activehosted.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.bunny.net",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://i.ytimg.com https://d226aj4ao1t61q.cloudfront.net",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.bunny.net",
      "connect-src 'self' https://vitals.vercel-insights.com",
      "frame-src 'self' https://www.youtube-nocookie.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://atuckercrowder.activehosted.com",
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
      {
        source: '/betareader',
        destination: 'https://docs.google.com/forms/d/e/1FAIpQLSeOpGMaOMJwCqu9WHUpJvjlYvRIgV6vC3BqdstVJvssPlWeqg/viewform?usp=dialog',
        permanent: false,
      },
      {
        source: '/DID',
        destination: '/did',
        permanent: false,
      },
    ];
  },
};

export default withPayload(nextConfig);
