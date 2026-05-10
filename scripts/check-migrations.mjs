#!/usr/bin/env node
// CI guard: when a PR touches collections/, require a new migration file.
//
// This catches the recurring class of bug where a Payload field is added
// to a collection config but no SQL migration ships with it, leaving prod
// missing the column (and the admin UI broken).
//
// Heuristic, not perfect:
//   - Only triggers when files under collections/ change.
//   - Passes if a new file was added under migrations/<timestamp>_*.ts.
//   - Override with `[skip-migration-check]` in any commit message in the
//     diff range — useful for non-schema collection changes (admin
//     descriptions, hooks, label tweaks, etc.).
//
// Inputs: env vars BASE_SHA and HEAD_SHA, or argv [base, head].

import { execSync } from 'node:child_process';

const base = process.argv[2] || process.env.BASE_SHA;
const head = process.argv[3] || process.env.HEAD_SHA || 'HEAD';

if (!base) {
  console.error('[check:migrations] BASE_SHA is required (or pass as $1)');
  process.exit(2);
}

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

const range = `${base}...${head}`;
const changedFiles = run(`git diff --name-only --diff-filter=ACMR ${range}`)
  .split('\n')
  .filter(Boolean);
const addedFiles = run(`git diff --name-only --diff-filter=A ${range}`)
  .split('\n')
  .filter(Boolean);

const collectionTouched = changedFiles.some((f) =>
  /^collections\/.+\.ts$/.test(f) && !/\.test\.ts$/.test(f),
);

if (!collectionTouched) {
  console.log('[check:migrations] OK — no collection changes in diff.');
  process.exit(0);
}

const migrationAdded = addedFiles.some((f) =>
  /^migrations\/\d{8}_\d{6}.*\.ts$/.test(f),
);

if (migrationAdded) {
  console.log('[check:migrations] OK — collection change ships with a migration.');
  process.exit(0);
}

const messages = run(`git log --format=%B ${range}`);
if (/\[skip-migration-check\]/.test(messages)) {
  console.log('[check:migrations] SKIP — [skip-migration-check] token in commit message.');
  process.exit(0);
}

console.error('');
console.error('[check:migrations] FAIL — collection change without a migration.');
console.error('');
console.error('  These collection files changed:');
for (const f of changedFiles.filter((f) => /^collections\/.+\.ts$/.test(f))) {
  console.error(`    ${f}`);
}
console.error('');
console.error('  No new file matching migrations/<timestamp>_*.ts was added.');
console.error('');
console.error('  If this PR adds/removes/changes a field type, write a migration:');
console.error('    DATABASE_URL=... npx payload migrate:create --name <descriptive>');
console.error('  Or add it by hand following the pattern in migrations/README.md.');
console.error('');
console.error('  If the collection change is non-schema (admin labels, hooks,');
console.error('  access functions, descriptions), include `[skip-migration-check]`');
console.error('  in a commit message in this PR to bypass.');
process.exit(1);
