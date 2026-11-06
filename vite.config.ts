import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// One build per language: VITE_LANG=sn gives the Shona site, under dist/sn. See scripts/build-all.mjs.
const lang = process.env.VITE_LANG || 'en';
const isEnglish = lang === 'en';
// Where the site sits on its host: '/claimflow' on GitHub Pages, empty at a domain's root.
const siteBase = (process.env.VITE_SITE_BASE || '').replace(/\/$/, '');

export default defineConfig({
  plugins: [
    react(),
    {
      // Icons are shared across languages, so every build points at the single copy.
      name: 'shared-icons',
      transformIndexHtml: {
        order: 'post',
        handler: (html) =>
          html.replace(
            /href="\/(favicon|apple-touch-icon|site\.webmanifest)/g,
            `href="${siteBase}/$1`,
          ),
      },
    },
  ],
  base: isEnglish ? `${siteBase}/` : `${siteBase}/${lang}/`,
  // Photos and icons are shared, and live at the top of the English site.
  publicDir: isEnglish ? 'public' : false,
  resolve: {
    alias: {
      '@locale': fileURLToPath(new URL(`./src/i18n/locales/${lang}.ts`, import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssr: {
    // These packages ship module formats Node cannot load directly, so bundle them for prerendering.
    noExternal: ['react-helmet-async', 'framer-motion', 'react-router-dom', 'lucide-react'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    outDir: isEnglish ? 'dist' : `dist/${lang}`,
  },
});
