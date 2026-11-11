import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5199 },
  // Les tests de logique (node:test) vivent dans tests/**/*.test.js ; seuls les tests d'interface passent par Vitest.
  test: { environment: 'jsdom', include: ['tests/**/*.test.jsx'], globals: false, setupFiles: ['tests/setup.js'] }
});
