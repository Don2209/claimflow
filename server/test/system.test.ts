import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { startFakeAi } from './fake-ai.ts';

const dataDir = mkdtempSync(join(tmpdir(), 'claimsflow-test-'));
process.env.DATA_DIR = dataDir;
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:4311';
process.env.ADMIN_EMAIL = 'boss@example.com';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';

const fakeAi = startFakeAi(4311);
const { app } = await import('../app.ts');
const { ensureFirstManager } = await import('../auth.ts');
const { ingestEmail } = await import('../email.ts');
const { claimsCsv } = await import('../reports.ts');

const PDF = (text: string) => Buffer.from(`%PDF-1.4\n${text}\n%%EOF`);
let cookie = '';

async function api(method: string, path: string, body?: unknown, who = cookie) {
  const form = body instanceof FormData;
  return app.request(`/api${path}`, {
    method,
    headers: { Cookie: who, Host: 'localhost', Origin: 'http://localhost', ...(form ? {} : { 'Content-Type': 'application/json' }) },
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });
}
const json = async (res: Response) => res.json() as Promise<any>;

async function settled(id: string) {
  for (let i = 0; i < 100; i += 1) {
    const claim = await json(await api('GET', `/claims/${id}?refresh=1`));
    if (claim.stage !== 'reading') return claim;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('The claim never finished');
}

const upload = (...files: [string, Buffer][]) => {
  const form = new FormData();
  for (const [name, data] of files) form.append('files', new File([new Uint8Array(data)], name));
  return form;
};

before(async () => {
  await ensureFirstManager();
  const res = await api('POST', '/login', { email: 'boss@example.com', password: 'correct-horse-battery' }, '');
  assert.equal(res.status, 200);
  cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
});
after(() => {
  fakeAi.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test('staff routes refuse anyone not signed in, and a wrong password', async () => {
  assert.equal((await api('GET', '/claims', undefined, '')).status, 401);
  assert.equal((await api('POST', '/login', { email: 'boss@example.com', password: 'nope' }, '')).status, 401);
});

test('a cross-site form post is refused', async () => {
  const res = await app.request('/api/logout', { method: 'POST', headers: { Origin: 'https://evil.example', Host: 'localhost', 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(res.status, 403);
});

test('a claim goes from upload to read, checked, flagged, summarised and drafted', async () => {
  const classes = (await json(await api('GET', '/meta'))).classes;
  const motor = classes.find((c: any) => c.name === 'Motor comprehensive');
  const claim = await json(await api('POST', '/claims', { class_id: motor.id, source: 'Sample Broker', contact_email: 'claims@sample-broker.example' }));
  assert.equal(claim.stage, 'new');

  const added = await json(await api('POST', `/claims/${claim.id}/documents`, upload(['form.pdf', PDF('form')], ['quote.pdf', PDF('quote')], ['virus.exe', Buffer.from('MZ')])));
  assert.deepEqual(added.added, ['form.pdf', 'quote.pdf']);
  assert.match(added.rejected[0], /not a PDF/);

  const done = await settled(claim.id);
  assert.equal(done.documents.every((d: any) => d.status === 'done'), true);
  assert.equal(done.documents.find((d: any) => d.filename === 'quote.pdf').docType, 'repair_quote');

  // The checklist ticks what arrived and shows what did not.
  const item = (type: string) => done.checklist.find((i: any) => i.type === type);
  assert.equal(item('claim_form').documentIds.length, 1);
  assert.equal(item('police_report').documentIds.length, 0);
  assert.equal(done.stage, 'missing');

  // Found by the rule check, and by the AI.
  assert.ok(done.flags.some((f: any) => f.origin === 'rule' && /registration differs/i.test(f.title) && /SMP 1234/.test(f.detail) && /SMP 1284/.test(f.detail)));
  assert.ok(done.flags.some((f: any) => f.origin === 'ai'));

  // Blank details are filled from the documents.
  assert.equal(done.claimantName, 'Farai Specimen');
  assert.equal(done.summary.overview.includes('police report'), true);
  assert.equal(done.draft.subject, 'Documents needed for your claim');

  // A handler's correction outranks the AI.
  const form = done.documents.find((d: any) => d.filename === 'form.pdf');
  const corrected = await json(await api('PATCH', `/documents/${form.id}`, { docType: 'police_report' }));
  assert.equal(corrected.checklist.find((i: any) => i.type === 'police_report').documentIds.length, 1);
  await api('POST', `/documents/${form.id}/retry`);
  const after = await settled(claim.id);
  assert.equal(after.documents.find((d: any) => d.id === form.id).docType, 'police_report');
  await api('PATCH', `/documents/${form.id}`, { docType: 'claim_form' });
  await settled(claim.id);

  // A dismissed flag stays dismissed after the file is reviewed again.
  const fresh = await settled(claim.id);
  const flag = fresh.flags.find((f: any) => f.origin === 'rule');
  await api('PATCH', `/flags/${flag.id}`, { status: 'dismissed', note: 'Typing error on the quote.' });
  await api('POST', `/claims/${claim.id}/review`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const reviewed = await settled(claim.id);
  assert.equal(reviewed.flags.find((f: any) => f.id === flag.id).status, 'dismissed');

  // An edited request is never overwritten by a later review.
  await api('PUT', `/claims/${claim.id}/draft`, { subject: 'Mine', body: 'My words.' });
  await api('POST', `/claims/${claim.id}/review`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal((await settled(claim.id)).draft.subject, 'Mine');

  // Approval is recorded, and with no mail server only "my own email" is allowed.
  assert.equal((await api('POST', `/claims/${claim.id}/draft/approve`, { subject: 'Mine', body: 'My words.', to: 'a@b.co', viaOwnEmail: false })).status, 409);
  const sent = await json(await api('POST', `/claims/${claim.id}/draft/approve`, { subject: 'Mine', body: 'My words.', to: 'a@b.co', viaOwnEmail: true }));
  assert.ok(sent.draft.sentAt);

  const trail = await json(await api('GET', `/audit?claim=${claim.ref}`));
  for (const action of ['Opened claim', 'Read document', 'Reviewed file', 'Corrected document label', 'Approved and sent the request email']) {
    assert.ok(trail.some((row: any) => row.action === action), action);
  }
});

test('requests to the AI use the agreed model, format and safety settings', () => {
  const { headers, body } = fakeAi.requests[0];
  assert.equal(body.model, 'claude-opus-5-5');
  assert.equal(body.fallbacks, 'default');
  assert.match(String(headers['anthropic-beta']), /server-side-fallback-2026-07-01/);
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.equal(body.messages[0].content[0].type, 'document');
  assert.equal(body.temperature, undefined);
});

test('a file on two claims, and a repeated quote number, are flagged', async () => {
  const one = await json(await api('POST', '/claims', {}));
  const two = await json(await api('POST', '/claims', {}));
  await api('POST', `/claims/${one.id}/documents`, upload(['quote.pdf', PDF('same quote')]));
  await settled(one.id);
  await api('POST', `/claims/${two.id}/documents`, upload(['quote copy.pdf', PDF('same quote')]));
  const done = await settled(two.id);
  assert.ok(done.flags.some((f: any) => f.title.includes(`same file is on claim ${one.ref}`)));
  assert.ok(done.flags.some((f: any) => f.title.includes('Q-5521') && f.title.includes(one.ref)));
});

test('a sideways phone photo is straightened and shrunk for reading, and kept as received', async () => {
  const photo = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const claim = await json(await api('POST', '/claims', {}));
  await api('POST', `/claims/${claim.id}/documents`, upload(['IMG_2041.png', photo]));
  const { documents } = await settled(claim.id);
  assert.equal(documents[0].status, 'done');
  const sent = fakeAi.requests.findLast((r) => r.body.messages[0].content[0].type === 'image');
  assert.equal(sent.body.messages[0].content[0].source.media_type, 'image/jpeg');
  const meta = await sharp(Buffer.from(sent.body.messages[0].content[0].source.data, 'base64')).metadata();
  assert.equal(Math.max(meta.width!, meta.height!), 2200);
  const opened = await api('GET', `/documents/${documents[0].id}/file`);
  assert.equal(Buffer.from(await opened.arrayBuffer()).equals(photo), true);
});

test('a loss date outside the policy period is flagged without the AI', async () => {
  const claim = await json(await api('POST', '/claims', { loss_date: '2027-01-05', policy_start: '2026-01-01', policy_end: '2026-12-31' }));
  await api('PATCH', `/claims/${claim.id}`, { notes: 'edited' });
  assert.ok((await json(await api('GET', `/claims/${claim.id}`))).flags.some((f: any) => /outside the policy period/.test(f.title)));
});

test('the upload link shows only the checklist, and works until it is replaced', async () => {
  const classes = (await json(await api('GET', '/meta'))).classes;
  const claim = await json(await api('POST', '/claims', { class_id: classes[0].id, claimant_name: 'Private Person' }));
  const token = claim.portalLink.split('/').pop();
  const view = await (await app.request(`/api/portal/${token}`)).text();
  assert.equal(view.includes('Private Person'), false);
  assert.equal(view.includes(claim.id), false);

  const form = upload(['photo.pdf', PDF('portal')]);
  assert.equal((await app.request(`/api/portal/${token}/documents`, { method: 'POST', headers: { Host: 'localhost', Origin: 'http://localhost' }, body: form })).status, 200);
  assert.equal((await settled(claim.id)).documents[0].origin, 'portal');

  await api('POST', `/claims/${claim.id}/portal`);
  assert.equal((await app.request(`/api/portal/${token}`)).status, 404);
  assert.equal((await app.request('/api/portal/guess')).status, 404);
});

test('documents are encrypted on disk, and open unchanged for staff only', async () => {
  const secret = 'SECRET-PERSONAL-DETAILS';
  const claim = await json(await api('POST', '/claims', {}));
  await api('POST', `/claims/${claim.id}/documents`, upload(['id.pdf', PDF(secret)]));
  const { documents } = await settled(claim.id);
  const stored = readFileSync(join(dataDir, 'files', documents[0].id));
  assert.equal(stored.includes(secret), false);
  assert.equal(readdirSync(join(dataDir, 'files')).includes(documents[0].id), true);
  const opened = await api('GET', `/documents/${documents[0].id}/file`);
  assert.equal(Buffer.from(await opened.arrayBuffer()).includes(secret), true);
  assert.equal((await api('GET', `/documents/${documents[0].id}/file`, undefined, '')).status, 401);
});

test('an email with attachments lands on the matching claim, once', async () => {
  const claim = await json(await api('POST', '/claims', { policy_number: 'POL-9988' }));
  const raw = (id: string, subject: string) => Buffer.from(
    [`From: Broker <desk@broker.example>`, `To: claims@insurer.example`, `Subject: ${subject}`, `Message-ID: <${id}@x>`, 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="B"', '', '--B', 'Content-Type: text/plain', '', 'Documents attached.', '--B',
      'Content-Type: application/pdf', 'Content-Disposition: attachment; filename="form.pdf"', 'Content-Transfer-Encoding: base64', '', PDF(id).toString('base64'), '--B--', ''].join('\r\n'),
  );
  const result = await ingestEmail(raw('m1', 'Claim for policy POL 9988'));
  assert.equal(result?.claimRef, claim.ref);
  assert.equal(await ingestEmail(raw('m1', 'Claim for policy POL 9988')), null);
  assert.equal((await settled(claim.id)).documents.length, 1);

  const unmatched = await ingestEmail(raw('m2', 'New accident'));
  assert.notEqual(unmatched?.claimRef, claim.ref);
  const created = (await json(await api('GET', `/claims?q=${unmatched?.claimRef}`)))[0];
  assert.equal(created.source, 'broker.example');
});

test('a handler cannot reach manager-only areas', async () => {
  await api('POST', '/users', { email: 'h@example.com', name: 'Handler', role: 'handler', password: 'long-enough-pass' });
  const res = await api('POST', '/login', { email: 'h@example.com', password: 'long-enough-pass' }, '');
  const handler = (res.headers.get('set-cookie') ?? '').split(';')[0];
  assert.equal((await api('GET', '/audit', undefined, handler)).status, 403);
  assert.equal((await api('GET', '/users', undefined, handler)).status, 403);
  assert.equal((await api('PUT', '/settings', { retentionDays: 1 }, handler)).status, 403);
  assert.equal((await api('GET', '/claims', undefined, handler)).status, 200);
});

test('exports neutralise spreadsheet formulas, and the dashboard counts', async () => {
  await api('POST', '/claims', { claimant_name: '=HYPERLINK("http://bad")', source: 'Bad Broker' });
  assert.ok(claimsCsv().includes(`"'=HYPERLINK(""http://bad"")"`));
  const xlsx = await api('GET', '/export/claims.xlsx');
  assert.equal(xlsx.status, 200);
  assert.equal(Buffer.from(await xlsx.arrayBuffer()).subarray(0, 2).toString(), 'PK');
  const dash = await json(await api('GET', '/dashboard'));
  assert.ok(dash.openClaims > 0);
  assert.ok(dash.sources.some((s: any) => s.source === 'Bad Broker'));
});

test('deleting a claim removes its files, and the last manager cannot be removed', async () => {
  const claim = await json(await api('POST', '/claims', {}));
  await api('POST', `/claims/${claim.id}/documents`, upload(['x.pdf', PDF('delete me')]));
  const { documents } = await settled(claim.id);
  assert.equal((await api('DELETE', `/claims/${claim.id}`)).status, 200);
  assert.equal(readdirSync(join(dataDir, 'files')).includes(documents[0].id), false);
  const me = await json(await api('GET', '/me'));
  assert.equal((await api('PATCH', `/users/${me.id}`, { active: false })).status, 409);
});
