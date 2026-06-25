/**
 * Clear `suppressNewsletter` on the post slugs passed as CLI args.
 * Recovers from accidental skipNewsletter=true sets via MCP.
 *
 *   npx tsx scripts/unsuppress-newsletter.ts <slug> [<slug> ...]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

const SLUGS = process.argv.slice(2).filter(Boolean);

if (SLUGS.length === 0) {
  console.error('Usage: tsx scripts/unsuppress-newsletter.ts <slug> [<slug> ...]');
  process.exit(1);
}

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
