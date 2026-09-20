import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/furry-history-board/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../../public/furry-history-board', import.meta.url)),
    emptyOutDir: true,
  },
});
