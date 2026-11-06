import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { createClaim } from './claims.ts';
import { config } from './config.ts';
import { all, audit, get, now, run, setSetting, setting, type Row } from './db.ts';
import { decryptText, encryptText } from './files.ts';
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
  const usable = mail.attachments.filter((item) => !(item.contentDisposition === 'inline' && item.size < MIN_INLINE_BYTES));
  const matched = matchClaim(`${mail.subject ?? ''}\n${mail.text ?? ''}`);
  // Newsletters and chatter should not become claims.
  if (!matched && !usable.length) {
    audit('Claims inbox', 'Ignored email with no attachments and no matching claim', null, `From ${sender}: "${mail.subject ?? ''}"`);
    run('INSERT INTO emails_seen (message_id, claim_ref, at) VALUES (?, ?, ?)', messageId, null, now());
    return null;
  }
  const claim =
    matched ??
    createClaim({ contact_email: sender, source: sender.split('@')[1] ?? '', notes: `From email: ${mail.subject ?? '(no subject)'}` }, 'Claims inbox');

  let added = 0;
  const skipped: string[] = [];
  for (const attachment of usable) {
    const name = attachment.filename || 'attachment';
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

// ---- The claims inbox, set up by a manager in Settings. ----
export type InboxSettings = { host: string; port: number; user: string; password: string; mailbox: string };
type Stored = Omit<InboxSettings, 'password'> & { passwordEncrypted: string; connectedAt: string };

const MAX_PER_CHECK = 20;
const MAX_MESSAGE_BYTES = 60 * 1024 * 1024;
const CHECK_EVERY_MS = 60_000;

const status = { lastCheck: null as string | null, lastError: null as string | null, lastAdded: 0, checking: false };

const stored = (): Stored | null => {
  const raw = setting('inbox');
  return raw ? JSON.parse(raw) : null;
};

function connect(settings: InboxSettings) {
  const client = new ImapFlow({
    host: settings.host,
    port: settings.port,
    secure: !config.allowPlainInbox,
    auth: { user: settings.user, pass: settings.password },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 120_000,
  });
  // Without a listener, a dropped connection would stop the whole app.
  client.on('error', (error: Error) => console.error('Inbox connection error:', error.message));
  return client;
}

function friendlyInboxError(error: unknown): string {
  const { authenticationFailed, code, mailboxMissing, message } = error as { authenticationFailed?: boolean; code?: string; mailboxMissing?: boolean; message?: string };
  if (authenticationFailed) return 'The mailbox refused that email and password. Gmail and Yahoo need an app password, not your normal one. Microsoft 365 usually blocks this kind of sign-in.';
  if (mailboxMissing) return 'That folder does not exist in this mailbox.';
  if (code === 'ENOTFOUND') return 'That mail server address could not be found. Check the spelling.';
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'CONNECT_TIMEOUT' || code === 'GREETING_TIMEOUT') return 'The mail server did not answer. Check the address and port.';
  if (code?.startsWith('ERR_TLS') || code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || code === 'CERT_HAS_EXPIRED') return "The mail server's security certificate could not be trusted.";
  return (message ?? 'The mailbox could not be reached.').slice(0, 200);
}

async function checkInbox(): Promise<number> {
  const saved = stored();
  if (!saved) return 0;
  const client = connect({ ...saved, password: decryptText(saved.passwordEncrypted) });
  let added = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock(saved.mailbox);
    try {
      const connectedAt = new Date(saved.connectedAt);
      const unseen = ((await client.search({ seen: false, since: connectedAt }, { uid: true })) || []).slice(0, MAX_PER_CHECK);
      for (const uid of unseen) {
        const facts = await client.fetchOne(String(uid), { size: true, internalDate: true }, { uid: true });
        if (!facts) continue;
        // The search only works by day, so mail from earlier on the connection day is left alone here.
        if (facts.internalDate && new Date(facts.internalDate) < connectedAt) continue;
        if ((facts.size ?? 0) > MAX_MESSAGE_BYTES) {
          audit('Claims inbox', 'Skipped an email larger than 60 MB');
        } else {
          const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
          if (!message || !message.source) continue;
          const result = await ingestEmail(message.source);
          added += result?.added ?? 0;
        }
        // Only marked as read once saved, so a failure is retried on the next check.
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return added;
}

export async function checkInboxNow() {
  if (status.checking || !stored()) return;
  status.checking = true;
  try {
    status.lastAdded = await checkInbox();
    status.lastCheck = now();
    status.lastError = null;
  } catch (error) {
    console.error('Inbox check failed:', error);
    status.lastError = friendlyInboxError(error);
  } finally {
    status.checking = false;
  }
}

export function inboxView() {
  const saved = stored();
  if (!saved) return { connected: false as const };
  return { connected: true as const, host: saved.host, port: saved.port, user: saved.user, mailbox: saved.mailbox, connectedAt: saved.connectedAt, ...status };
}

/** Tests the details first, so a mistake is reported straight away and nothing wrong is saved. A blank password keeps the saved one. */
export async function connectInbox(input: Omit<InboxSettings, 'password'> & { password: string }): Promise<string | null> {
  const previous = stored();
  const password = input.password || (previous && previous.user === input.user && previous.host === input.host ? decryptText(previous.passwordEncrypted) : '');
  if (!password) return 'Enter the password for this mailbox.';
  const client = connect({ ...input, password });
  try {
    await client.connect();
    await client.mailboxOpen(input.mailbox, { readOnly: true });
    await client.logout().catch(() => undefined);
  } catch (error) {
    client.close();
    return friendlyInboxError(error);
  }
  const saved: Stored = { host: input.host, port: input.port, user: input.user, mailbox: input.mailbox, passwordEncrypted: encryptText(password), connectedAt: now() };
  setSetting('inbox', JSON.stringify(saved));
  Object.assign(status, { lastCheck: null, lastError: null, lastAdded: 0 });
  void checkInboxNow();
  return null;
}

export function disconnectInbox() {
  run("DELETE FROM settings WHERE key = 'inbox'");
  Object.assign(status, { lastCheck: null, lastError: null, lastAdded: 0 });
}

export function startInboxWatcher() {
  const tick = () => void checkInboxNow().finally(() => setTimeout(tick, CHECK_EVERY_MS));
  tick();
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
