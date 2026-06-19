/**
 * One-shot: clear `suppressNewsletter` on a fixed list of post slugs.
 * Used to recover from accidental skipNewsletter=true sets via MCP.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

const SLUGS = [
  'gallery-view-5-breadcrumbs',
  'gallery-view-6-stack-trace',
  'gallery-view-7-gallery-view',
  'ive-been-waiting-for-this-my-whole-life',
  'disposable-art-is-still-art',
  'my-brain-was-built-for-this',
];

async function main(): Promise<void> {
  const { getPayload } = await import('payload');
  const configPromise = (await import('../payload.config')).default;
  const payload = await getPayload({ config: configPromise });

  for (const slug of SLUGS) {
    const found = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });
    const post = found.docs[0];
    if (!post) {
      console.log(`  ${slug}: NOT FOUND`);
      continue;
    }
    await payload.update({
      collection: 'posts',
      id: post.id,
      data: { suppressNewsletter: false },
      overrideAccess: true,
    });
    console.log(`  ${slug}: suppressNewsletter cleared`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
