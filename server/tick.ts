import { forgetOldAttempts } from './auth.ts';
import { checkInboxNow } from './email.ts';
import { applyRetention, pump, recoverStalledWork } from './pipeline.ts';
import { sweepIncoming } from './uploads.ts';

/**
 * Everything that happens on a timer, in one place. On Vercel a scheduled request runs it (see /api/cron/tick);
 * the local server runs it every minute. Each step is safe to run twice at once.
 */
export async function tick() {
  const steps: [string, () => Promise<unknown>][] = [
    ['putting back cut-off work', () => recoverStalledWork()],
    ['checking the claims inbox', () => checkInboxNow()],
    ['reading waiting documents', () => pump()],
    ['applying the retention period', () => applyRetention()],
    ['removing abandoned uploads', () => sweepIncoming()],
    ['forgetting old sign-in attempts', () => forgetOldAttempts()],
  ];
  const problems: string[] = [];
  for (const [what, step] of steps) {
    try {
      await step();
    } catch (error) {
      console.error(`Scheduled work failed while ${what}:`, error);
      problems.push(what);
    }
  }
  return problems;
}
