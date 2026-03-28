import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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
