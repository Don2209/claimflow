import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
const PDF = new TextEncoder().encode('%PDF-1.4 form');
const form: any = await (await app.request('/api/public/claim-form')).json();
const start = (files: [string, Uint8Array<ArrayBuffer>][], fields: Record<string, string> = { consent: 'true', website: '' }, address = '10.0.0.1') => {
  const body = new FormData();
  Object.entries(fields).forEach(([name, value]) => body.append(name, value));
  files.forEach(([name, data]) => body.append('files', new File([data], name)));
  return app.request('/api/public/claims', { method: 'POST', headers: { Host: 'localhost', Origin: 'http://localhost', 'X-Forwarded-For': address }, body });
};
const signIn = async () => {
  const login = await app.request('/api/login', { method: 'POST', headers: base, body: JSON.stringify({ email: 'boss@example.com', password: 'correct-horse-battery' }) });
  return { ...base, Cookie: (login.headers.get('set-cookie') ?? '').split(';')[0] };
};
const claimCount = async () => ((await (await app.request('/api/claims', { headers: await signIn() })).json()) as unknown[]).length;

test('the page works signed out, asks for nothing, and warns while on a free AI plan', () => {
  assert.deepEqual(form, { testOnly: true });
});

test('spam, unconsented and unusable uploads are refused without opening a claim', async () => {
  assert.equal((await start([['form.pdf', PDF]], { consent: 'false', website: '' })).status, 400);
  assert.equal((await start([['form.pdf', PDF]], { consent: 'true', website: 'http://spam.example' })).status, 400);
  assert.equal((await start([])).status, 400);
  const res = await start([['virus.exe', new TextEncoder().encode('MZ')]]);
  assert.equal(res.status, 400);
  assert.match(((await res.json()) as any).error, /could not be opened/);
  assert.equal(await claimCount(), 0);
});

test('a client only uploads, and the AI fills in the claim, including how to reach them', async () => {
  const res = await start([['form.pdf', PDF], ['virus.exe', new TextEncoder().encode('MZ')]], undefined, '10.0.0.2');
  assert.equal(res.status, 201);
  const reply: any = await res.json();
  assert.deepEqual(Object.keys(reply), ['token', 'rejected']);
  assert.equal(reply.rejected.length, 1);

  const headers = await signIn();
  const rows: any = await (await app.request('/api/claims', { headers })).json();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'Client self-service');
  let claim: any;
  for (let i = 0; i < 100; i += 1) {
    claim = await (await app.request(`/api/claims/${rows[0].id}?refresh=1`, { headers })).json();
    if (claim.stage !== 'reading') break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(claim.documents[0].status, 'done');
  assert.equal(claim.documents[0].origin, 'portal');
  assert.equal(claim.claimantName, 'Farai Specimen');
  assert.equal(claim.contactEmail, 'farai@example.com');
  assert.equal(claim.contactPhone, '+263 77 000 0000');
  assert.equal(claim.className, 'Motor comprehensive');
  assert.equal(claim.lossDate, '2026-09-01');

  const view = await (await app.request(`/api/portal/${reply.token}`)).text();
  for (const secret of ['Farai', 'farai@example.com', '+263', 'SMPL-POL']) assert.equal(view.includes(secret), false, secret);
  assert.equal(JSON.parse(view).testOnly, true);
  assert.ok(JSON.parse(view).checklist.length > 0);
});

test('Word, Excel and text files are read, and the AI gets their contents', async () => {
  const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
  const res = await start([['form.docx', fixture('form.docx')], ['old.doc', fixture('old.doc')], ['list.xlsx', fixture('list.xlsx')], ['note.txt', new TextEncoder().encode('Text note SPECIMEN-TXT')]], undefined, '10.0.0.5');
  assert.equal(res.status, 201);
  const { rejected }: any = await res.json();
  assert.deepEqual(rejected, []);
  const sent = () => JSON.stringify(fakeAi.requests.map((request) => request.body.contents));
  for (let i = 0; i < 200 && !['SPECIMEN-DOCX', 'SPECIMEN-DOC-OLD', 'SPECIMEN-XLSX', 'SPECIMEN-TXT'].every((mark) => sent().includes(mark)); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  for (const mark of ['SPECIMEN-DOCX', 'SPECIMEN-DOC-OLD', 'SPECIMEN-XLSX', 'SPECIMEN-TXT']) assert.ok(sent().includes(mark), mark);
  // The picture pasted into the Word document goes along as an image.
  assert.ok(fakeAi.requests.some((request) => request.body.contents[0].parts.some((part: any) => part.inlineData?.mimeType === 'image/jpeg')));
});

test('renamed and oversized archives do not pass as documents', async () => {
  const { detectFileType } = await import('../files.ts');
  assert.equal(detectFileType(Buffer.from('MZ'), 'report.docx'), null);
  assert.equal(detectFileType(Buffer.from('PK\x03\x04 not really a zip'), 'report.docx'), null);
  assert.equal(detectFileType(Buffer.from('binary\0text'), 'note.txt'), null);
  const bomb = Buffer.alloc(30 + 46 + 17 + 22);
  bomb.writeUInt32LE(0x04034b50, 0);
  bomb.writeUInt32LE(0x02014b50, 30);
  bomb.writeUInt32LE(0xffffffff, 30 + 24);
  bomb.writeUInt16LE(17, 30 + 28);
  bomb.write('word/document.xml', 30 + 46);
  bomb.writeUInt32LE(0x06054b50, 93);
  bomb.writeUInt16LE(1, 93 + 10);
  bomb.writeUInt32LE(30, 93 + 16);
  assert.equal(detectFileType(bomb, 'bomb.docx'), null);
});

test('one address cannot start endless claims', async () => {
  for (let i = 0; i < 5; i += 1) assert.equal((await start([[`f${i}.pdf`, PDF]], undefined, '10.0.0.3')).status, 201);
  assert.equal((await start([['f.pdf', PDF]], undefined, '10.0.0.3')).status, 429);
  assert.equal((await start([['f.pdf', PDF]], undefined, '10.0.0.4')).status, 201);
});
