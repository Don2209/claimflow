// The entry for the Vercel function. scripts/vercel-build.mjs bundles this file; every /api request comes here.
// The screens are static files served by Vercel's CDN, and timed work arrives as requests to /api/cron/tick.
import { getRequestListener } from '@hono/node-server';
import { app } from './app.ts';

export default getRequestListener(app.fetch);
