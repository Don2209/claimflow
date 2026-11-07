// Runs ClaimsFlow as an ordinary Node server: for local use, and for any host that keeps a process running.
// On Vercel, server/vercel.ts is the entry instead, and scheduled work arrives as requests to /api/cron/tick.
import { existsSync, readFileSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app.ts';
import { ensureFirstManager } from './auth.ts';
import { config } from './config.ts';
import { recoverStalledWork } from './pipeline.ts';
import { tick } from './tick.ts';

const built = 'dist-app';
if (existsSync(built)) {
  app.use('/assets/*', serveStatic({ root: built, onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable') }));
  app.use('*', serveStatic({ root: built, rewriteRequestPath: (path) => (path === '/' ? '/__none__' : path) }));
  const page = readFileSync(`${built}/index.html`, 'utf8');
  app.get('*', (c) => c.html(page));
}

await ensureFirstManager();
if (!config.aiConfigured) console.warn('ANTHROPIC_API_KEY is not set. Documents will wait in the queue until it is.');
// Only this process was working, so anything left mid-read was cut off by the restart.
await recoverStalledWork(0);
const everyMinute = () => void tick().finally(() => setTimeout(everyMinute, 60_000));
everyMinute();

serve({ fetch: app.fetch, port: config.port }, () => console.log(`ClaimsFlow is running on port ${config.port}`));
