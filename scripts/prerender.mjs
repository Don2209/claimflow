// Turns the built app into one static HTML file per route, plus sitemap.xml and robots.txt.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.env.VITE_LANG || 'en';
const isEnglish = lang === 'en';
const siteBase = (process.env.VITE_SITE_BASE || '').replace(/\/$/, '');
const base = isEnglish ? `${siteBase}/` : `${siteBase}/${lang}/`;
const dist = isEnglish ? join(root, 'dist') : join(root, 'dist', lang);
const ssrDir = join(root, 'dist-ssr');

const env = loadEnv('production', root, 'VITE_');
const siteUrl = (env.VITE_SITE_URL || 'https://claimsflow.example').replace(/\/$/, '');

const { render, routePaths, translatedRoutes, languageCodes } = await import(
  pathToFileURL(join(ssrDir, 'entry-server.js')).href
);
const template = await readFile(join(dist, 'index.html'), 'utf8');

// Preload the one font file used above the fold, so headlines render in the right face straight away.
const assets = await readdir(join(dist, 'assets'));
const font = assets.find((name) => /big-shoulders-display-latin-wght-normal.*\.woff2$/.test(name));
const motion = assets.find((name) => /^motion-features.*\.js$/.test(name));
const preload = [
  font &&
    `<link rel="preload" href="${base}assets/${font}" as="font" type="font/woff2" crossorigin />`,
  motion && `<link rel="modulepreload" href="${base}assets/${motion}" />`,
]
  .filter(Boolean)
  .join('\n    ');

// Inline the stylesheet so first paint does not wait on a separate request.
const cssFile = assets.find((name) => name.endsWith('.css'));
const css = cssFile ? await readFile(join(dist, 'assets', cssFile), 'utf8') : '';

async function writePage(url, file) {
  const { html, head } = await render(url);
  const page = template
    .replace('<html lang="en-GB">', `<html lang="${isEnglish ? 'en-GB' : lang}">`)
    .replace(/<title>.*?<\/title>\s*/, '')
    .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`)
    .replace('<!--head-->', `${head}\n    ${preload}`)
    .replace('<!--app-->', html);
  const target = join(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, page);
}

for (const path of routePaths) {
  await writePage(path, path === '/' ? 'index.html' : join(path.slice(1), 'index.html'));
}
// The 404 page, sitemap and robots.txt are shared, and written once with the English site.
if (isEnglish) {
  await writePage('/__not-found', '404.html');

  const today = new Date().toISOString().slice(0, 10);
  const localised = languageCodes
    .filter((code) => code !== 'en')
    .flatMap((code) => translatedRoutes.map((path) => `/${code}${path === '/' ? '/' : path}`));
  const urls = [...routePaths, ...localised]
    .map(
      (path) =>
        `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
    )
    .join('\n');
  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  await writeFile(
    join(dist, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  );
}

await rm(ssrDir, { recursive: true, force: true });
console.log(`Prerendered ${routePaths.length + 1} pages for ${siteUrl}`);
