import { existsSync, readFileSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app, applyRetention } from './app.ts';
import { ensureFirstManager } from './auth.ts';
import { config } from './config.ts';
import { startInboxWatcher } from './email.ts';
import { resumeAfterRestart } from './pipeline.ts';

const built = 'dist-app';
if (existsSync(built)) {
  app.use('/assets/*', serveStatic({ root: built, onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable') }));
  app.use('*', serveStatic({ root: built, rewriteRequestPath: (path) => (path === '/' ? '/__none__' : path) }));
  const page = readFileSync(`${built}/index.html`, 'utf8');
  app.get('*', (c) => c.html(page));
}

await ensureFirstManager();
if (!config.aiConfigured) console.warn('ANTHROPIC_API_KEY is not set. Documents will wait in the queue until it is.');
resumeAfterRestart();
startInboxWatcher();
applyRetention();
setInterval(applyRetention, 6 * 3600 * 1000);

serve({ fetch: app.fetch, port: config.port }, () => console.log(`ClaimsFlow is running on port ${config.port}`));
