// Builds the site once per language. English goes in dist/, the others in dist/<code>/.
import { execSync } from 'node:child_process';

const source = await import('node:fs/promises').then((fs) =>
  fs.readFile(new URL('../src/i18n/languages.ts', import.meta.url), 'utf8'),
);
const codes = [...source.matchAll(/code: '([a-z]+)'/g)].map((match) => match[1]);

for (const code of codes) {
  const env = { ...process.env, VITE_LANG: code };
  const run = (command) => execSync(command, { env, stdio: ['ignore', 'ignore', 'inherit'] });
  run('npx vite build');
  run(`npx vite build --ssr src/entry-server.tsx --outDir dist-ssr`);
  run('node scripts/prerender.mjs');
}
