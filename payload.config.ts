import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Posts } from './collections/Posts.js';
import { Groups } from './collections/Groups.js';
import { Books } from './collections/Books.js';
import { Projects } from './collections/Projects.js';
import { Demos } from './collections/Demos.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    theme: 'dark',
  },
  collections: [Posts, Groups, Books, Projects, Demos],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'default-secret-change-me',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
