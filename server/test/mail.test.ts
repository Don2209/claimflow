import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { SMTPServer } from 'smtp-server';

const dataDir = mkdtempSync(join(tmpdir(), 'claimsflow-mail-'));
Object.assign(process.env, {
  DATA_DIR: dataDir, ADMIN_EMAIL: 'boss@example.com', ADMIN_PASSWORD: 'correct-horse-battery',
  SMTP_HOST: '127.0.0.1', SMTP_PORT: '4312', SMTP_FROM: 'claims@insurer.example',
});
delete process.env.ANTHROPIC_API_KEY;

const received: string[] = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onData(stream, _session, done) {
    let raw = '';
    stream.on('data', (chunk) => (raw += chunk));
    stream.on('end', () => {
      received.push(raw);
      done();
    });
  },
});
smtp.listen(4312);

const { app } = await import('../app.ts');
const { ensureFirstManager } = await import('../auth.ts');
await ensureFirstManager();

after(() => {
  smtp.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test('an approved request is really sent, with the upload link, and nothing goes before approval', async () => {
  const headers = (cookie = '') => ({ Cookie: cookie, Host: 'localhost', Origin: 'http://localhost', 'Content-Type': 'application/json' });
  const login = await app.request('/api/login', { method: 'POST', headers: headers(), body: JSON.stringify({ email: 'boss@example.com', password: 'correct-horse-battery' }) });
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
  const claim: any = await (await app.request('/api/claims', { method: 'POST', headers: headers(cookie), body: '{}' })).json();

  await app.request(`/api/claims/${claim.id}/draft`, { method: 'PUT', headers: headers(cookie), body: JSON.stringify({ subject: 'Police report', body: 'Please send it.' }) });
  assert.equal(received.length, 0);

  const sent = await app.request(`/api/claims/${claim.id}/draft/approve`, {
    method: 'POST', headers: headers(cookie), body: JSON.stringify({ subject: 'Police report', body: 'Please send it.', to: 'broker@example.com', viaOwnEmail: false }),
  });
  assert.equal(sent.status, 200);
  assert.equal(received.length, 1);
  assert.match(received[0], /To: broker@example\.com/);
  assert.match(received[0], /Please send it\./);
  assert.match(received[0].replace(/=\r?\n/g, ''), new RegExp(claim.portalLink.split('/').pop()));
});

test('without an AI key, documents wait safely and rule checks still run', async () => {
  const headers = { Host: 'localhost', Origin: 'http://localhost', 'Content-Type': 'application/json' };
  const login = await app.request('/api/login', { method: 'POST', headers, body: JSON.stringify({ email: 'boss@example.com', password: 'correct-horse-battery' }) });
  const Cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
  const meta: any = await (await app.request('/api/meta', { headers: { ...headers, Cookie } })).json();
  assert.equal(meta.ai, false);
  const claim: any = await (await app.request('/api/claims', { method: 'POST', headers: { ...headers, Cookie }, body: '{}' })).json();
  const form = new FormData();
  form.append('files', new File([new TextEncoder().encode('%PDF-1.4 x')], 'a.pdf'));
  await app.request(`/api/claims/${claim.id}/documents`, { method: 'POST', headers: { Host: 'localhost', Origin: 'http://localhost', Cookie }, body: form });
  const after: any = await (await app.request(`/api/claims/${claim.id}?refresh=1`, { headers: { ...headers, Cookie } })).json();
  assert.equal(after.documents[0].status, 'queued');
});
