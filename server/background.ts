import { waitUntil } from '@vercel/functions';

/**
 * Runs work after the reply has gone. On Vercel, waitUntil keeps the function alive until it ends (up to the function's
 * time limit). Locally it simply carries on in the running server. Failures are logged, never thrown at the caller.
 */
export function later(work: Promise<unknown>) {
  const guarded = work.catch((error) => console.error('Background work failed:', error));
  try {
    waitUntil(guarded);
  } catch {
    // Not inside a Vercel request, so nothing needs to be kept alive.
  }
}
