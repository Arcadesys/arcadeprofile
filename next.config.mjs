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
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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
