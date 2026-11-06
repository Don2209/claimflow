import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';

const dataDir = resolve(process.env.DATA_DIR || 'data');
mkdirSync(join(dataDir, 'files'), { recursive: true });

/** The key for documents on disk. Set DATA_ENCRYPTION_KEY in production, and keep a copy: without it the files cannot be read. */
function encryptionKey(): Buffer {
  const fromEnv = process.env.DATA_ENCRYPTION_KEY;
  if (fromEnv) return createHash('sha256').update(fromEnv).digest();
  const path = join(dataDir, '.data-key');
  if (!existsSync(path)) {
    writeFileSync(path, randomBytes(32).toString('base64'), { mode: 0o600 });
    console.warn('DATA_ENCRYPTION_KEY is not set, so a key was created beside the data. Do not do this in production.');
  }
  return createHash('sha256').update(readFileSync(path, 'utf8')).digest();
}

// Gemini when its key is set, unless AI_PROVIDER says otherwise.
const provider = process.env.AI_PROVIDER === 'anthropic' || !process.env.GEMINI_API_KEY ? 'anthropic' : 'gemini';

const publicUrl = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:8787').replace(/\/$/, '');

export const config = {
  port: Number(process.env.PORT || 8787),
  dataDir,
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
  imap: process.env.IMAP_HOST
    ? {
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT || 993),
        user: process.env.IMAP_USER || '',
        pass: process.env.IMAP_PASS || '',
        mailbox: process.env.IMAP_MAILBOX || 'INBOX',
        secure: process.env.IMAP_SECURE !== 'false',
      }
    : null,
};
