/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

// Disable Tailwind for Payload admin CSS — Tailwind v3 strips native
// CSS @layer declarations (like @layer payload-default) that Payload relies on.
/** @param {string} path */
function isPayloadFile(path) {
  return (
    path.includes('@payloadcms') ||
    path.includes('app/(payload)')
  );
}

/** @type {import('postcss-load-config').Config} */
const payloadConfig = {
  plugins: {},
};

export default (/** @type {{ resourcePath?: string; file?: string }} */ ctx) => {
  const filePath = ctx.resourcePath || ctx.file || '';
  if (isPayloadFile(filePath)) {
    return payloadConfig;
  }
  return config;
};
