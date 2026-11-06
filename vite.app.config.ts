import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';
import siteTheme from './tailwind.config';

// The product app. It shares the site's theme, and has its own CSS so the site stays light.
export default defineConfig({
  root: 'app',
  publicDir: false,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss({ ...siteTheme, content: ['./app/index.html', './app/src/**/*.{ts,tsx}', './src/components/Logo.tsx'] }), autoprefixer()],
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5180, fs: { allow: ['..'] }, proxy: { '/api': 'http://localhost:8787' } },
  build: { outDir: '../dist-app', emptyOutDir: true, target: 'es2020' },
});
