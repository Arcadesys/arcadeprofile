#!/usr/bin/env node
// One-off: write a fresh drizzle snapshot of the current Payload config
// to a target path, bypassing payload migrate:create's interactive
// rename-prompts. Used to refresh the baseline when the existing
// snapshots are too stale to diff against.
//
// Usage:
//   DATABASE_URL=... node scripts/write-baseline-snapshot.mjs migrations/<name>.json
//
// What it does (mirrors @payloadcms/drizzle/buildCreateMigration's first
// few lines):
//   const { generateDrizzleJson } = adapter.requireDrizzleKit();
//   const json = await generateDrizzleJson(adapter.schema);
//   fs.writeFileSync(target, JSON.stringify(json, null, 2));
//
// This is safe — no DB writes, no prompts, no migration .ts produced.

import fs from 'node:fs';
import path from 'node:path';
import { getPayload } from 'payload';
import config from '../payload.config.ts';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/write-baseline-snapshot.mjs <output.json>');
  process.exit(2);
}

const payload = await getPayload({ config });
const adapter = payload.db;
const { generateDrizzleJson } = adapter.requireDrizzleKit();
const snapshot = await generateDrizzleJson(adapter.schema);

fs.writeFileSync(target, JSON.stringify(snapshot, null, 2));
const stat = fs.statSync(target);
console.log(`wrote ${target} (${stat.size} bytes)`);
process.exit(0);
