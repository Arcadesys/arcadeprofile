#!/usr/bin/env node
// CI guard: migrations/index.ts must match what `payload migrate:create`
// would generate. Catches the bug class from 87de991, where a migration
// .ts file existed on disk but was missing from index.ts so `payload
// migrate` silently skipped it in production.
//
// Logic mirrors @payloadcms's writeMigrationIndex:
//   node_modules/payload/dist/database/migrations/writeMigrationIndex.js
// If that ever changes shape, regenerate via `payload migrate:create
// --skip-empty` and update the constants below.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = 'migrations';
const INDEX_FILE = path.join(MIGRATIONS_DIR, 'index.ts');

// Payload picks the import extension based on tsconfig.compilerOptions
// .moduleResolution. This repo uses "bundler", so importExt is ''. If
// you flip to NodeNext, set this to '.js' and regenerate index.ts.
const IMPORT_EXT = '';

function getMigrationFiles(dir) {
  return readdirSync(dir)
    .filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        file !== 'index.ts' &&
        file !== 'index.js',
    )
    .sort();
}

function generateIndexContent(files) {
  let imports = '';
  let exportsArray = 'export const migrations = [\n';
  files.forEach((file, index) => {
    const fileNameWithoutExt = file.replace(/\.[^/.]+$/, '');
    imports += `import * as migration_${fileNameWithoutExt} from './${fileNameWithoutExt}${IMPORT_EXT}';\n`;
    exportsArray += `  {
    up: migration_${fileNameWithoutExt}.up,
    down: migration_${fileNameWithoutExt}.down,
    name: '${fileNameWithoutExt}'${index !== files.length - 1 ? ',' : ''}\n  },\n`;
  });
  exportsArray += '];\n';
  return imports + '\n' + exportsArray;
}

const files = getMigrationFiles(MIGRATIONS_DIR);
const expected = generateIndexContent(files);
const actual = readFileSync(INDEX_FILE, 'utf8');

if (actual === expected) {
  console.log(`[check:migration-index] OK — ${files.length} migration(s) registered.`);
  process.exit(0);
}

console.error('');
console.error('[check:migration-index] FAIL — migrations/index.ts is out of sync with disk.');
console.error('');
console.error('  Expected output of `payload migrate:create` differs from the checked-in file.');
console.error('  This usually means a migration .ts was added (or renamed/removed) without');
console.error('  re-running the CLI, so `payload migrate` will skip it in production.');
console.error('');
console.error('  Fix:');
console.error('    DATABASE_URL=... npx payload migrate:create --skip-empty');
console.error('  Then commit the updated migrations/index.ts.');
console.error('');

if (process.env.DEBUG_MIGRATION_INDEX) {
  console.error('--- expected ---');
  console.error(expected);
  console.error('--- actual ---');
  console.error(actual);
}
process.exit(1);
