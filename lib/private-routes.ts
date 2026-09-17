// Shareable-but-unlisted routes.
//
// Add future soft-published pages here as `publicPath: internalPath`.
// The public path should be an unguessable UUID. The internal path remains
// available to Next.js for rendering, but middleware blocks direct requests.
// Pages should also set `robots: { index: false, follow: true }` until launch.
export const PRIVATE_ROUTE_REWRITES: Readonly<Record<string, string>> = {
  '/7f3b2d9e-4c61-4a8f-b572-91e6c3d0a745': '/mff',
};

export const PRIVATE_INTERNAL_PATHS = new Set(Object.values(PRIVATE_ROUTE_REWRITES));
