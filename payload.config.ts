import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import sharp from 'sharp';
import { Posts } from './collections/Posts';
import { Groups } from './collections/Groups';
import { Books } from './collections/Books';
import { Projects } from './collections/Projects';
import { Demos } from './collections/Demos';
import { Pages } from './collections/Pages';
import { Media } from './collections/Media';
import { Users } from './collections/Users';
import { Subscribers } from './collections/Subscribers';
import { SocialPosts } from './collections/SocialPosts';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const defaultFromAddress = process.env.POSTMARK_FROM_EMAIL || 'austen@thearcades.me';
const defaultFromName = process.env.POSTMARK_FROM_NAME || 'The Arcades';
const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
const databaseURL = process.env.DATABASE_URL || process.env.DATABASE_URI || '';

const email = postmarkToken
  ? nodemailerAdapter({
      defaultFromAddress,
      defaultFromName,
      skipVerify: true,
      transportOptions: {
        host: 'smtp.postmarkapp.com',
        port: 587,
        secure: false,
        auth: {
          user: postmarkToken,
          pass: postmarkToken,
        },
      },
    })
  : undefined;

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    theme: 'dark',
  },
  collections: [Users, Posts, Groups, Books, Projects, Demos, Pages, Media, Subscribers, SocialPosts],
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
