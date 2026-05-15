import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import sharp from 'sharp';
import { collections, globals } from './collections';
import { YouTubeBlock } from './blocks/YouTube';
import { createPayloadEmailAdapter } from './lib/payload-email';
import { getDatabaseURLForPayloadConfig, getPayloadSecret } from './lib/env';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Match `migrate`, `migrate:status`, `migrate:fresh`, etc. — any Payload
// migrate subcommand needs a real DATABASE_URL to connect; failing fast
// at config load gives a clearer error than a downstream connection error.
const requiresDatabaseURL = process.argv.some(
  (arg) => arg === 'migrate' || arg.startsWith('migrate:'),
);
const databaseURL = getDatabaseURLForPayloadConfig({ requireDatabaseURL: requiresDatabaseURL });
const email = createPayloadEmailAdapter();

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    theme: 'dark',
    components: {
      afterNavLinks: [
        '/views/hopper/HopperNavLink#default',
        '/views/group-scenes/GroupScenesNavLink#default',
      ],
      views: {
        hopper: {
          Component: '/views/hopper/HopperView#default',
          path: '/hopper',
        },
        groupScenes: {
          Component: '/views/group-scenes/GroupScenesView#default',
          path: '/group-scenes',
        },
      },
    },
  },
  collections,
  globals,
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      BlocksFeature({ blocks: [YouTubeBlock] }),
    ],
  }),
  email,
  sharp,
  secret: getPayloadSecret(),
  db: postgresAdapter({
    // Avoid interactive Drizzle schema-push prompts during `next dev`.
    // Schema changes should be applied via explicit migrations instead.
    push: false,
    pool: {
      connectionString: databaseURL,
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [
    vercelBlobStorage({
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
});
