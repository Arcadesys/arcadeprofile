import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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
      {
        source: '/series',
        destination: '/writing',
        permanent: true,
      },
      {
        source: '/series/essay/:slug',
        destination: '/writing/group/:slug',
        permanent: true,
      },
    ];
  },
};

export default withPayload(nextConfig);
