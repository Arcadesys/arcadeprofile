import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['app/components/EndOfPieceSubscribe.test.tsx'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'https://www.thearcades.me' } },
  },
});
