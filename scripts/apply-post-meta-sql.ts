/**
 * Apply hand-written SEO meta + discoverability fields via raw SQL.
 *
 * Why raw SQL instead of `payload.update`: Payload's update pipeline runs a
 * "locked documents" check that joins `payload_locked_documents_rels` on every
 * collection's id column. In this project's current state, that table is
 * missing `post_reactions_id` (the 20260514_010000 migration created the
 * post_reactions collection table but didn't extend the rels table), so any
 * payload.update fails before reaching the data layer. Raw UPDATE statements
 * sidestep the issue entirely — and bypass the afterChange newsletter hook
 * by definition.
 *
 * Trade-off: skips `revalidatePathsFor`. Next.js ISR will pick up the new
 * meta on its natural revalidation cycle, or on the next deploy. For an SEO
 * backfill running before robots are unblocked, that's fine.
 *
 * Each column write is gated by `column IS NULL OR trim(column) = ''` so
 * existing non-empty values are never overwritten.
 *
 * Input shape (data/posts-meta-output.json):
 *   {
 *     "<slug>": {
 *       "meta": { "title"?, "description"?, "keywords"? },
 *       "discoverability": { "social_hook"?, "search_summary"? }
 *     }
 *   }
 *
 * Usage:
 *   npm run apply:post-meta-sql -- --dry-run
 *   npm run apply:post-meta-sql -- --only <slug>
 *   npm run apply:post-meta-sql
 */
import { readFileSync } from 'fs';
import { Pool } from 'pg';

interface CliArgs {
  dryRun: boolean;
  only: string | null;
  inFile: string;
}

interface InputEntry {
  meta?: { title?: string; description?: string; keywords?: string };
  discoverability?: { social_hook?: string; search_summary?: string };
}

type InputFile = Record<string, InputEntry>;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, only: null, inFile: 'data/posts-meta-output.json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--in') args.inFile = argv[++i];
  }
  return args;
}

const COLUMNS: Array<{ col: string; key: keyof InputEntry; field: string; label: string }> = [
  { col: 'meta_title', key: 'meta', field: 'title', label: 'meta.title' },
  { col: 'meta_description', key: 'meta', field: 'description', label: 'meta.description' },
  { col: 'meta_keywords', key: 'meta', field: 'keywords', label: 'meta.keywords' },
  { col: 'discoverability_social_hook', key: 'discoverability', field: 'social_hook', label: 'social_hook' },
  { col: 'discoverability_search_summary', key: 'discoverability', field: 'search_summary', label: 'search_summary' },
];

function pickValue(entry: InputEntry, key: keyof InputEntry, field: string): string | undefined {
  const bucket = entry[key] as Record<string, string | undefined> | undefined;
  return bucket?.[field];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = readFileSync(args.inFile, 'utf8');
  const input = JSON.parse(raw) as InputFile;

  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;
  if (!connectionString) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const slugs = args.only ? [args.only] : Object.keys(input);
  const counts = { updated: 0, noop: 0, missing: 0, error: 0 };

  for (const slug of slugs) {
    const entry = input[slug];
    if (!entry) {
      console.warn(`[warn] ${slug} | not in input file`);
      counts.missing++;
      continue;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    const provided: string[] = [];
    let p = 1;
    for (const { col, key, field, label } of COLUMNS) {
      const v = pickValue(entry, key, field);
      if (v == null || v.trim() === '') continue;
      provided.push(label);
      sets.push(`${col} = CASE WHEN ${col} IS NULL OR btrim(${col}) = '' THEN $${p} ELSE ${col} END`);
      params.push(v);
      p++;
    }

    if (sets.length === 0) {
      counts.noop++;
      console.log(`[noop] ${slug} | nothing provided`);
      continue;
    }

    params.push(slug);
    const sql = `UPDATE posts SET ${sets.join(', ')} WHERE slug = $${p} RETURNING id, meta_title, meta_description, meta_keywords, discoverability_social_hook, discoverability_search_summary`;

    if (args.dryRun) {
      console.log(`[dry] ${slug} | provided: ${provided.join(', ')}`);
      console.log('SQL:', sql);
      console.log('params:', params);
      counts.updated++;
      continue;
    }

    try {
      const res = await pool.query(sql, params);
      if (res.rowCount === 0) {
        counts.missing++;
        console.warn(`[missing] ${slug} | no row matched`);
        continue;
      }
      const row = res.rows[0] as Record<string, string | null>;
      const filledNow: string[] = [];
      const skipped: string[] = [];
      for (const { col, key, field, label } of COLUMNS) {
        const v = pickValue(entry, key, field);
        if (v == null || v.trim() === '') continue;
        if (row[col] === v.trim() || row[col] === v) {
          filledNow.push(label);
        } else {
          skipped.push(label);
        }
      }
      console.log(
        `[write] ${slug} | filled: ${filledNow.join(', ') || '(none)'}` +
          (skipped.length ? ` | preserved-existing: ${skipped.join(', ')}` : ''),
      );
      counts.updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[error] ${slug} | ${msg}`);
      counts.error++;
    }
  }

  await pool.end();
  console.log(
    `\nDone (${args.dryRun ? 'dry-run' : 'write'}). updated=${counts.updated} noop=${counts.noop} missing=${counts.missing} error=${counts.error}`,
  );
  process.exit(counts.error > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
