import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'import/no-anonymous-default-export': 'warn',
      '@next/next/no-img-element': 'warn',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
    // The patterns above only anchor at the repo root. Nested git worktrees
    // (Claude/Codex scratch checkouts) carry their own .next and
    // node_modules, so without these a single stale worktree floods `npm run
    // lint` with thousands of errors from compiled output that is not ours.
    '**/.next/**',
    '**/node_modules/**',
    '.claude/**',
  ]),
]);
