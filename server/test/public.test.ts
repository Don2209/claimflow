import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { startFakeAi } from './fake-ai.ts';

const dataDir = mkdtempSync(join(tmpdir(), 'claimsflow-public-'));
Object.assign(process.env, {
  DATA_DIR: dataDir, GEMINI_API_KEY: 'test-key', GEMINI_BASE_URL: 'http://127.0.0.1:4316', GEMINI_RETRY_WAITS: '10',
  ADMIN_EMAIL: 'boss@example.com', ADMIN_PASSWORD: 'correct-horse-battery',
});
delete process.env.ANTHROPIC_API_KEY;
const fakeAi = startFakeAi(4316);
const { app } = await import('../app.ts');
const { ensureFirstManager } = await import('../auth.ts');
await ensureFirstManager();
after(() => {
  fakeAi.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const base = { Host: 'localhost', Origin: 'http://localhost', 'Content-Type': 'application/json' };
const form: any = await (await app.request('/api/public/claim-form')).json();
const motor = form.classes.find((item: any) => item.name === 'Motor comprehensive');
const valid = { claimant_name: 'Farai Specimen', contact_email: 'farai@example.com', class_id: motor.id, policy_number: 'SMPL-POL-7731', vehicle_reg: 'SMP 1234', loss_date: '2026-09-14', notes: 'An elephant hit the car.', consent: true, website: '' };
const start = (body: object, address = '10.0.0.1') =>
  app.request('/api/public/claims', { method: 'POST', headers: { ...base, 'X-Forwarded-For': address }, body: JSON.stringify(body) });

test('the form works signed out, and warns while on a free AI plan', () => {
  assert.equal(form.testOnly, true);
  assert.ok(form.classes.length >= 6);
  assert.equal(JSON.stringify(form).includes('claimant'), false);
});

test('incomplete, spam and unconsented claims are refused', async () => {
  assert.equal((await start({ ...valid, claimant_name: '' })).status, 400);
  assert.equal((await start({ ...valid, consent: false })).status, 400);
  assert.equal((await start({ ...valid, website: 'http://spam.example' })).status, 400);
  assert.equal((await start({ ...valid, class_id: 'made-up' })).status, 400);
});

test('a client starts a claim, uploads, and staff see it, with nothing private shown to the client', async () => {
  const res = await start(valid, '10.0.0.2');
  assert.equal(res.status, 201);
  const reply: any = await res.json();
  assert.deepEqual(Object.keys(reply), ['token']);

  const upload = new FormData();
  upload.append('files', new File([new TextEncoder().encode('%PDF-1.4 form')], 'form.pdf'));
  const headers = { Host: 'localhost', Origin: 'http://localhost' };
  assert.equal((await app.request(`/api/portal/${reply.token}/documents`, { method: 'POST', headers, body: upload })).status, 200);

  const view = await (await app.request(`/api/portal/${reply.token}`)).text();
  for (const secret of ['Farai', 'farai@example.com', 'SMPL-POL', 'elephant']) assert.equal(view.includes(secret), false, secret);
  assert.equal(JSON.parse(view).testOnly, true);

  const login = await app.request('/api/login', { method: 'POST', headers: base, body: JSON.stringify({ email: 'boss@example.com', password: 'correct-horse-battery' }) });
  const Cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
  const rows: any = await (await app.request('/api/claims', { headers: { ...base, Cookie } })).json();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'Client self-service');
  let claim: any;
  for (let i = 0; i < 100; i += 1) {
    claim = await (await app.request(`/api/claims/${rows[0].id}?refresh=1`, { headers: { ...base, Cookie } })).json();
    if (claim.stage !== 'reading') break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(claim.documents[0].status, 'done');
  assert.equal(claim.documents[0].origin, 'portal');
  assert.equal(claim.notes, 'An elephant hit the car.');
  const sent = fakeAi.requests.findLast((request) => String(request.body.contents[0].parts[0].text).includes('Review this claim file'));
  assert.match(sent.body.contents[0].parts[0].text, /An elephant hit the car/);
});

test('one address cannot start endless claims', async () => {
  for (let i = 0; i < 5; i += 1) assert.equal((await start(valid, '10.0.0.3')).status, 201);
  assert.equal((await start(valid, '10.0.0.3')).status, 429);
  assert.equal((await start(valid, '10.0.0.4')).status, 201);
});
