import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import hoodiecrow from 'hoodiecrow-imap';
import { startFakeAi } from './fake-ai.ts';

const dataDir = mkdtempSync(join(tmpdir(), 'claimsflow-inbox-'));
Object.assign(process.env, {
  DATA_DIR: dataDir, ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://127.0.0.1:4314', INBOX_ALLOW_PLAIN: 'true',
  ADMIN_EMAIL: 'boss@example.com', ADMIN_PASSWORD: 'correct-horse-battery',
});
delete process.env.GEMINI_API_KEY;
const PASSWORD = 'mailbox-secret-pass';

const email = (id: string, subject: string, attach = true) =>
  [`From: Broker <desk@broker.example>`, 'To: claims@insurer.example', `Subject: ${subject}`, `Message-ID: <${id}@x>`, 'MIME-Version: 1.0',
    ...(attach
      ? ['Content-Type: multipart/mixed; boundary="B"', '', '--B', 'Content-Type: text/plain', '', 'Attached.', '--B', 'Content-Type: application/pdf',
          `Content-Disposition: attachment; filename="${id}-form.pdf"`, 'Content-Transfer-Encoding: base64', '', Buffer.from(`%PDF-1.4 ${id}`).toString('base64'), '--B--', '']
      : ['Content-Type: text/plain', '', 'Our newsletter.', ''])].join('\r\n');

const later = () => new Date(Date.now() + 60 * 60 * 1000);
const mailServer = hoodiecrow({
  plugins: ['id', 'enable', 'unselect', 'special-use', 'literalplus', 'sasl-ir'],
  users: { 'claims@insurer.example': { password: PASSWORD } },
  storage: {
    INBOX: {
      messages: [
        { raw: email('old', 'Old unread mail'), flags: [], internaldate: new Date('2020-01-01T10:00:00Z') },
        { raw: email('new', 'New accident'), flags: [], internaldate: later() },
        { raw: email('chatter', 'Our newsletter', false), flags: [], internaldate: later() },
      ],
    },
  },
});

const fakeAi = startFakeAi(4314);
const { app } = await import('../app.ts');
const { ensureFirstManager } = await import('../auth.ts');
await ensureFirstManager();

const base = { Host: 'localhost', Origin: 'http://localhost', 'Content-Type': 'application/json' };
let Cookie = '';
const call = (method: string, path: string, body?: unknown, cookie = Cookie) =>
  app.request(`/api${path}`, { method, headers: { ...base, Cookie: cookie }, body: body ? JSON.stringify(body) : undefined });

before(async () => {
  await new Promise<void>((resolve) => mailServer.listen(4315, resolve));
  const login = await call('POST', '/login', { email: 'boss@example.com', password: 'correct-horse-battery' }, '');
  Cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
});
after(() => {
  fakeAi.close();
  mailServer.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const details = { host: '127.0.0.1', port: 4315, user: 'claims@insurer.example', mailbox: 'INBOX' };

test('a wrong password is explained, and nothing is saved', async () => {
  const res = await call('PUT', '/settings/inbox', { ...details, password: 'wrong' });
  assert.equal(res.status, 400);
  assert.match(((await res.json()) as any).error, /refused that email and password/);
  assert.equal(((await (await call('GET', '/settings/inbox')).json()) as any).connected, false);
});

test('a handler cannot see or change the inbox', async () => {
  await call('POST', '/users', { email: 'h@example.com', name: 'Handler', role: 'handler', password: 'long-enough-pass' });
  const login = await call('POST', '/login', { email: 'h@example.com', password: 'long-enough-pass' }, '');
  const handler = (login.headers.get('set-cookie') ?? '').split(';')[0];
  assert.equal((await call('GET', '/settings/inbox', undefined, handler)).status, 403);
  assert.equal((await call('PUT', '/settings/inbox', { ...details, password: PASSWORD }, handler)).status, 403);
});

test('connecting processes only new mail with attachments, and never exposes the password', async () => {
  const res = await call('PUT', '/settings/inbox', { ...details, password: PASSWORD });
  assert.equal(res.status, 200);
  assert.equal(JSON.stringify(await res.json()).includes(PASSWORD), false);
  assert.equal(existsSync(join(dataDir, 'claimsflow.db')) && readFileSync(join(dataDir, 'claimsflow.db')).includes(PASSWORD), false);

  const view: any = await (await call('POST', '/settings/inbox/check')).json();
  assert.equal(view.lastError, null);

  let claims: any[] = [];
  for (let i = 0; i < 100; i += 1) {
    claims = (await (await call('GET', '/claims')).json()) as any[];
    if (claims.length && claims[0].stage !== 'reading') break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(claims.length, 1, 'only the new email with an attachment opens a claim');
  assert.equal(claims[0].source, 'broker.example');
  const claim: any = await (await call('GET', `/claims/${claims[0].id}?refresh=1`)).json();
  assert.equal(claim.documents[0].filename, 'new-form.pdf');
  assert.equal(claim.documents[0].origin, 'email');
  assert.equal(claim.documents[0].status, 'done');

  const messages = mailServer.storage.INBOX.messages;
  const seen = (id: string) => messages.find((m: any) => m.raw.toString().includes(`<${id}@x>`)).flags.includes('\\Seen');
  // The first check runs in the background, and marks each email as read once it is saved.
  for (let i = 0; i < 100 && !(seen('new') && seen('chatter')); i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(seen('old'), false, 'older mail is left alone');
  assert.equal(seen('new'), true);
  assert.equal(seen('chatter'), true);

  await call('POST', '/settings/inbox/check');
  assert.equal(((await (await call('GET', '/claims')).json()) as any[]).length, 1, 'checking again changes nothing');
});

test('disconnecting stops watching and removes the saved details', async () => {
  await call('DELETE', '/settings/inbox');
  assert.equal(((await (await call('GET', '/settings/inbox')).json()) as any).connected, false);
});
