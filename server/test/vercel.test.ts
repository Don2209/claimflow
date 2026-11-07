import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

// What has to hold when several copies of the app run at once, as on Vercel.
const dataDir = mkdtempSync(join(tmpdir(), 'claimsflow-vercel-'));
process.env.DATA_DIR = dataDir;
process.env.CRON_SECRET = 'a-long-enough-secret';
process.env.ADMIN_EMAIL = 'boss@example.com';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GEMINI_API_KEY;

const { app } = await import('../app.ts');
const { createClaim } = await import('../claims.ts');
const { all, get, releaseLock, run, takeLock } = await import('../db.ts');
const { saveFile, streamFile } = await import('../files.ts');
const { recoverStalledWork } = await import('../pipeline.ts');

const call = (path: string, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { Host: 'localhost', Origin: 'http://localhost', ...(init.headers ?? {}) } });

let cookie = '';
before(async () => {
  const res = await call('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'boss@example.com', password: 'correct-horse-battery' }) });
  assert.equal(res.status, 200);
  cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
});
after(() => rmSync(dataDir, { recursive: true, force: true }));

test('claims opened at the same moment never share a reference', async () => {
  const claims = await Promise.all(Array.from({ length: 12 }, () => createClaim({}, 'Test')));
  assert.equal(new Set(claims.map((claim) => claim.ref)).size, 12);
  assert.ok(claims.every((claim) => /^CF-\d{4}-\d{5}$/.test(claim.ref)));
});

test('a lock is held by one copy at a time, and frees itself when its holder is cut off', async () => {
  const takers = await Promise.all([takeLock('job', 60_000), takeLock('job', 60_000), takeLock('job', 60_000)]);
  assert.deepEqual(takers.filter(Boolean).length, 1);
  await releaseLock('job');
  assert.equal(await takeLock('job', -1), true, 'free again once released');
  assert.equal(await takeLock('job', 60_000), true, 'a lock that ran out can be taken');
});

test('a read cut off by the time limit is put back, and one that keeps stopping goes to a person', async () => {
  const claim = await createClaim({}, 'Test');
  const old = new Date(Date.now() - 60 * 60_000).toISOString();
  const add = (id: string, attempts: number, since: string) =>
    run(
      "INSERT INTO documents (id, claim_id, filename, mime, size, sha256, origin, status, reading_since, read_attempts, created_at) VALUES (?, ?, 'a.pdf', 'application/pdf', 1, 'x', 'upload', 'reading', ?, ?, ?)",
      id, claim.id, since, attempts, old,
    );
  await add('cut-off', 1, old);
  await add('keeps-stopping', 3, old);
  await add('still-reading', 1, new Date().toISOString());
  await recoverStalledWork();
  const status = Object.fromEntries((await all('SELECT id, status FROM documents WHERE claim_id = ?', claim.id)).map((row) => [row.id, row.status]));
  assert.deepEqual(status, { 'cut-off': 'queued', 'keeps-stopping': 'failed', 'still-reading': 'reading' });
});

test('scheduled work runs only for a caller with the cron secret', async () => {
  assert.equal((await call('/api/cron/tick')).status, 401);
  assert.equal((await call('/api/cron/tick', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  const res = await call('/api/cron/tick?wait=1', { headers: { Authorization: 'Bearer a-long-enough-secret' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, problems: [] });
  // Without ?wait it answers at once, for schedulers that give up after a few seconds.
  const quick = await call('/api/cron/tick', { headers: { Authorization: 'Bearer a-long-enough-secret' } });
  assert.equal(quick.status, 202);
});

test("files sent to storage for one claim cannot be added to another", async () => {
  const mine = await createClaim({}, 'Test');
  const other = await createClaim({}, 'Test');
  const res = await call(`/api/portal/${mine.portal_token}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploads: [
      { pathname: `incoming/portal-${other.portal_token}/x/a.pdf`, name: 'a.pdf' },
      { pathname: `incoming/portal-${mine.portal_token}/../portal-${other.portal_token}/a.pdf`, name: 'b.pdf' },
    ] }),
  });
  assert.equal(res.status, 400);
  assert.equal((await get('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', mine.id))!.n, 0);
});

test('upload tokens are not handed out when files go through the app', async () => {
  const res = await call('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{}' });
  assert.equal(res.status, 404);
  const meta = await (await call('/api/meta', { headers: { Cookie: cookie } })).json();
  assert.equal(meta.directUploads, false);
});

test('a streamed document opens unchanged, and a tampered one fails instead of finishing', async () => {
  const data = Buffer.from('%PDF-1.4\n' + 'x'.repeat(200_000) + '\n%%EOF');
  await saveFile('streamed', data);
  const read = async () => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of (await streamFile('streamed')) as unknown as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return Buffer.concat(chunks);
  };
  assert.deepEqual(await read(), data);

  const path = join(dataDir, 'files', 'streamed');
  const stored = readFileSync(path);
  stored[stored.length - 10] ^= 1;
  writeFileSync(path, stored);
  await assert.rejects(read);
});
