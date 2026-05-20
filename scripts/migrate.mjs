#!/usr/bin/env node
// Wrapper that loads .env.* before delegating to `payload migrate`.
//
// Next.js loads env files automatically for next dev/build/start, but the
// Payload CLI bin imports payload.config.ts with no env preload — so
// DATABASE_URL ends up undefined and `lib/env.ts` falls back to the
// placeholder hostname. This wrapper fixes that without putting an
// @next/env import inside payload.config.ts (which Next.js bundles for
// the runtime and can't extract a default export from cleanly).

import { spawn } from 'node:child_process';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const child = spawn('payload', ['migrate', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
