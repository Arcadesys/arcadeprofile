import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import sharp from 'sharp';
import { collections } from './collections';
import { createPayloadEmailAdapter } from './lib/payload-email';
import { getDatabaseURLForPayloadConfig } from './lib/env';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const databaseURL = getDatabaseURLForPayloadConfig();
const email = createPayloadEmailAdapter();

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    theme: 'dark',
  },
  collections,
  editor: lexicalEditor(),
  email,
  sharp,
  secret: process.env.PAYLOAD_SECRET || 'default-secret-change-me',
  db: postgresAdapter({
    pool: {
      connectionString: databaseURL,
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
