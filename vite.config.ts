import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// base matches the GitHub Pages path https://<user>.github.io/pravinverse/
export default defineConfig({ base: '/pravinverse/', plugins: [react()], test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] } });
