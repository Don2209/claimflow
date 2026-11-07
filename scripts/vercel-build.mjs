// Builds one of the two Vercel projects in this repository, using Vercel's Build Output API (.vercel/output).
// Writing the output ourselves lets one repository hold two projects with different headers and routes.
//
//   CLAIMSFLOW_PART=site  The marketing website (the default): static, prerendered pages.
//   CLAIMSFLOW_PART=app   The ClaimsFlow app: its screens as static files, the API as one Node function,
//                         and a schedule that calls /api/cron/tick. Set CLAIMSFLOW_CRON to change how often.
//
// Run it locally with `CLAIMSFLOW_PART=app node scripts/vercel-build.mjs`, then inspect .vercel/output.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.vercel', 'output');
const part = (process.env.CLAIMSFLOW_PART || 'site').trim();
const run = (command, env = {}) => execSync(command, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

if (!['site', 'app'].includes(part)) {
  console.error(`CLAIMSFLOW_PART must be "site" or "app", not "${part}".`);
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });

const longCache = { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true };

if (part === 'site') buildSite();
else await buildApp();
console.log(`Built the ${part} for Vercel in ${relative(root, out)}`);

function buildSite() {
  // Canonical links and the sitemap need the public address. Vercel knows it once a production domain is set.
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const env = {};
  if (!process.env.VITE_SITE_URL && productionHost) env.VITE_SITE_URL = `https://${productionHost}`;
  if (!process.env.VITE_SITE_BASE) env.VITE_SITE_BASE = '';
  run('npm run build', env);

  cpSync(join(root, 'dist'), join(out, 'static'), { recursive: true });
  writeJson(join(out, 'config.json'), {
    version: 3,
    routes: [
      longCache,
      {
        src: '/(.*)',
        headers: { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' },
        continue: true,
      },
      // Each page is prerendered to <path>/index.html. Serve it at /path and /path/.
      { handle: 'filesystem' },
      { src: '^/(.+?)/?$', dest: '/$1/index.html', check: true },
      { handle: 'error' },
      { status: 404, src: '^(?!/api).*$', dest: '/404.html' },
    ],
  });
}

async function buildApp() {
  run('npm run product:build');
  cpSync(join(root, 'dist-app'), join(out, 'static'), { recursive: true });

  // The API: our code bundled into one file, and the packages it uses copied beside it as they are.
  const func = join(out, 'functions', 'api.func');
  mkdirSync(func, { recursive: true });
  const { build } = await import('esbuild');
  const entry = join(func, 'index.mjs');
  await build({
    entryPoints: [join(root, 'server', 'vercel.ts')],
    outfile: entry,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    packages: 'external',
    sourcemap: 'inline',
    logLevel: 'warning',
  });

  const { nodeFileTrace } = await import('@vercel/nft');
  const { fileList, warnings } = await nodeFileTrace([entry], { base: root });
  for (const warning of warnings) if (!/Failed to (resolve|parse)/.test(String(warning.message))) console.warn(warning.message);
  const files = new Set([...fileList].filter((file) => file.startsWith('node_modules/')));
  // Native parts that are found by a name worked out at run time, so tracing cannot see them.
  for (const scope of ['@img', '@libsql']) {
    const dir = join(root, 'node_modules', scope);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (scope === '@libsql' && !/^(linux|darwin|win32)-/.test(name)) continue;
      cpSync(join(dir, name), join(func, 'node_modules', scope, name), { recursive: true, dereference: true });
    }
  }
  for (const file of files) {
    const target = join(func, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(root, file), target, { dereference: true });
  }
  writeJson(join(func, 'package.json'), { type: 'module' });
  writeJson(join(func, '.vc-config.json'), {
    runtime: 'nodejs24.x',
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
    // The most the Hobby plan allows. Reading continues after the reply until this, and the schedule picks up the rest.
    maxDuration: Number(process.env.CLAIMSFLOW_MAX_DURATION || 300),
  });

  writeJson(join(out, 'config.json'), {
    version: 3,
    routes: [
      {
        src: '/(.*)',
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Security-Policy':
            "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.blob.vercel-storage.com https://vercel.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
        },
        continue: true,
      },
      longCache,
      { src: '^/api(/.*)?$', dest: '/api' },
      { handle: 'filesystem' },
      // Every other address is a screen of the app.
      { src: '/(.*)', dest: '/index.html' },
    ],
    crons: [{ path: '/api/cron/tick', schedule: process.env.CLAIMSFLOW_CRON || '* * * * *' }],
  });
  console.log(`Function: ${files.size} package files traced.`);
}
