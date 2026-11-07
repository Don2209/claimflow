import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';

const dataDir = resolve(process.env.DATA_DIR || 'data');
// Vercel sets VERCEL. Its disk is read-only and not kept, so data lives in Turso and Vercel Blob there.
const onVercel = Boolean(process.env.VERCEL);

/** The key for stored documents. Set DATA_ENCRYPTION_KEY in production, and keep a copy: without it the files cannot be read. */
function encryptionKey(): Buffer {
  const fromEnv = process.env.DATA_ENCRYPTION_KEY;
  if (fromEnv) return createHash('sha256').update(fromEnv).digest();
  if (onVercel) throw new Error('Set DATA_ENCRYPTION_KEY in the Vercel project settings. Without it, stored documents cannot be opened.');
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, '.data-key');
  if (!existsSync(path)) {
    writeFileSync(path, randomBytes(32).toString('base64'), { mode: 0o600 });
    console.warn('DATA_ENCRYPTION_KEY is not set, so a key was created beside the data. Do not do this in production.');
  }
  return createHash('sha256').update(readFileSync(path, 'utf8')).digest();
}

// Gemini when its key is set, unless AI_PROVIDER says otherwise.
const provider = process.env.AI_PROVIDER === 'anthropic' || !process.env.GEMINI_API_KEY ? 'anthropic' : 'gemini';

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const publicUrl = (process.env.PUBLIC_URL || (vercelUrl ? `https://${vercelUrl}` : '') || 'http://localhost:8787').replace(/\/$/, '');

export const config = {
  port: Number(process.env.PORT || 8787),
  dataDir,
  onVercel,
  databaseUrl: process.env.TURSO_DATABASE_URL || '',
  databaseToken: process.env.TURSO_AUTH_TOKEN || undefined,
  // Private Vercel Blob when its token is set. Otherwise files go in DATA_DIR/files.
  blobToken: process.env.BLOB_READ_WRITE_TOKEN || '',
  // Vercel sends this with each scheduled run, so nobody else can start one.
  cronSecret: process.env.CRON_SECRET || '',
  publicUrl,
  secureCookies: publicUrl.startsWith('https://'),
  key: encryptionKey(),
  provider,
  model: process.env.CLAIMSFLOW_MODEL || (provider === 'gemini' ? 'gemini-3.6-flash' : 'claude-opus-5-5'),
  // Tried in turn when a free Gemini model is busy or hangs.
  geminiBackups: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
  aiConfigured: Boolean(provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY),
  // Free Gemini content can be read by Google's reviewers, so the app warns about real documents. Set GEMINI_PAID=true on a paid plan.
  freeAiPlan: provider === 'gemini' && process.env.GEMINI_PAID !== 'true',
  maxFileBytes: 25 * 1024 * 1024,
  maxPortalDocuments: 40,
  // Anyone can upload without signing in and each file costs an AI call, so this caps the daily bill.
  maxPublicDocumentsPerDay: Number(process.env.PUBLIC_DOCUMENTS_PER_DAY || 500),
  // Only for tests against a local mail server. Real mailboxes always use TLS.
  allowPlainInbox: process.env.INBOX_ALLOW_PLAIN === 'true',
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
        secure: process.env.SMTP_SECURE === 'true',
      }
    : null,
};
