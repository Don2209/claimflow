import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { startFakeAi } from './fake-ai.ts';

const dataDir = mkdtempSync(join(tmpdir(), 'claimsflow-gemini-'));
Object.assign(process.env, {
  DATA_DIR: dataDir, GEMINI_API_KEY: 'test-key', GEMINI_BASE_URL: 'http://127.0.0.1:4313', GEMINI_RETRY_WAITS: '10,10',
  ADMIN_EMAIL: 'boss@example.com', ADMIN_PASSWORD: 'correct-horse-battery',
});
delete process.env.ANTHROPIC_API_KEY;
delete process.env.AI_PROVIDER;

const fakeAi = startFakeAi(4313);
const { app } = await import('../app.ts');
const { ensureFirstManager } = await import('../auth.ts');
await ensureFirstManager();

after(() => {
  fakeAi.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const base = { Host: 'localhost', Origin: 'http://localhost' };
const login = await app.request('/api/login', { method: 'POST', headers: { ...base, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'boss@example.com', password: 'correct-horse-battery' }) });
const Cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];

async function upload(name: string): Promise<any> {
  const claim: any = await (await app.request('/api/claims', { method: 'POST', headers: { ...base, Cookie, 'Content-Type': 'application/json' }, body: '{}' })).json();
  const form = new FormData();
  form.append('files', new File([new TextEncoder().encode(`%PDF-1.4 ${name}`)], name));
  await app.request(`/api/claims/${claim.id}/documents`, { method: 'POST', headers: { ...base, Cookie }, body: form });
  for (let i = 0; i < 100; i += 1) {
    const now: any = await (await app.request(`/api/claims/${claim.id}?refresh=1`, { headers: { ...base, Cookie } })).json();
    if (now.stage !== 'reading') return now;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('The claim never finished');
}

test('the app says it is on a free plan, and Gemini reads and reviews a file', async () => {
  const meta: any = await (await app.request('/api/meta', { headers: { ...base, Cookie } })).json();
  assert.equal(meta.freeAiPlan, true);
  assert.equal(meta.aiName, "Google's Gemini");
  const done = await upload('form.pdf');
  assert.equal(done.documents[0].docType, 'claim_form');
  assert.ok(done.summary.overview);
  const sent = fakeAi.requests.find((request) => request.gemini);
  assert.match(sent.url, /gemini-3\.6-flash:generateContent/);
  assert.equal(sent.body.contents[0].parts[0].inlineData.mimeType, 'application/pdf');
  assert.equal(sent.body.generationConfig.responseMimeType, 'application/json');
});

test('a busy model hands over to the next one', async () => {
  fakeAi.limitNextRequests(2);
  const before = fakeAi.requests.length;
  assert.equal((await upload('form two.pdf')).documents[0].status, 'done');
  const used = fakeAi.requests.slice(before, before + 3).map((request) => request.url);
  assert.match(used[0], /gemini-3\.6-flash/);
  assert.match(used[1], /gemini-3\.5-flash-lite/);
  assert.match(used[2], /gemini-3\.1-flash-lite/);
});

test('when every model is busy, it waits and tries them all again', async () => {
  fakeAi.limitNextRequests(4);
  assert.equal((await upload('form four.pdf')).documents[0].status, 'done');
});

test('a lasting rate limit becomes a clear message, and the document can be read again', async () => {
  fakeAi.limitNextRequests(9);
  const failed = await upload('form three.pdf');
  assert.equal(failed.documents[0].status, 'failed');
  assert.match(failed.documents[0].error, /usage limit/);
});
