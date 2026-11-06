import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { createClaim } from './claims.ts';
import { config } from './config.ts';
import { all, audit, get, now, run, type Row } from './db.ts';
import { addDocument, FileRejected } from './pipeline.ts';

const compact = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const MIN_INLINE_BYTES = 30 * 1024; // Smaller inline images are logos and signatures.

/** A reference, policy number or registration is a strong match. A name only counts when one open claim has it. */
export function matchClaim(text: string): Row | undefined {
  const haystack = compact(text);
  const open = all('SELECT * FROM claims WHERE handed_over_at IS NULL ORDER BY created_at DESC');
  for (const key of ['ref', 'policy_number', 'vehicle_reg']) {
    const hit = open.find((claim) => claim[key] && compact(claim[key]).length >= 4 && haystack.includes(compact(claim[key])));
    if (hit) return hit;
  }
  const byName = open.filter((claim) => claim.claimant_name && compact(claim.claimant_name).length >= 6 && haystack.includes(compact(claim.claimant_name)));
  return byName.length === 1 ? byName[0] : undefined;
}

export async function ingestEmail(raw: Buffer): Promise<{ claimRef: string; added: number; skipped: string[] } | null> {
  const mail = await simpleParser(raw);
  const messageId = mail.messageId || `no-id:${mail.date?.toISOString()}:${mail.subject}`;
  if (get('SELECT 1 AS x FROM emails_seen WHERE message_id = ?', messageId)) return null;

  const sender = mail.from?.value[0]?.address ?? '';
  const claim =
    matchClaim(`${mail.subject ?? ''}\n${mail.text ?? ''}`) ??
    createClaim({ contact_email: sender, source: sender.split('@')[1] ?? '', notes: `From email: ${mail.subject ?? '(no subject)'}` }, 'Claims inbox');

  let added = 0;
  const skipped: string[] = [];
  for (const attachment of mail.attachments) {
    const name = attachment.filename || 'attachment';
    if (attachment.contentDisposition === 'inline' && attachment.size < MIN_INLINE_BYTES) continue;
    try {
      addDocument(claim, name, attachment.content, 'email', 'Claims inbox');
      added += 1;
    } catch (error) {
      if (!(error instanceof FileRejected)) throw error;
      skipped.push(error.message);
    }
  }
  audit('Claims inbox', 'Received email', claim.ref, `From ${sender}: "${mail.subject ?? ''}". ${added} added, ${skipped.length} skipped. ${skipped.join(' ')}`);
  run('INSERT INTO emails_seen (message_id, claim_ref, at) VALUES (?, ?, ?)', messageId, claim.ref, now());
  return { claimRef: claim.ref, added, skipped };
}

export const inbox = { lastCheck: null as string | null, lastError: null as string | null };

async function checkInbox() {
  const imap = config.imap!;
  const client = new ImapFlow({ host: imap.host, port: imap.port, secure: imap.secure, auth: { user: imap.user, pass: imap.pass }, logger: false });
  await client.connect();
  try {
    const lock = await client.getMailboxLock(imap.mailbox);
    try {
      const unseen = (await client.search({ seen: false }, { uid: true })) || [];
      for (const uid of unseen) {
        const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (message && message.source) {
          await ingestEmail(message.source);
          // Only marked as read once saved, so a failure is retried on the next check.
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export function startInboxWatcher() {
  if (!config.imap) return;
  const tick = () =>
    checkInbox()
      .then(() => {
        inbox.lastCheck = now();
        inbox.lastError = null;
      })
      .catch((error: Error) => {
        inbox.lastError = error.message;
        console.error('Inbox check failed:', error.message);
      })
      .finally(() => setTimeout(tick, 60_000));
  void tick();
}

export async function sendEmail(to: string, subject: string, text: string) {
  const smtp = config.smtp;
  if (!smtp) throw new Error('Email sending is not set up.');
  const transport = nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  await transport.sendMail({ from: smtp.from, to, subject, text });
}
