import { Hono, type Context, type Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { z } from 'zod';
import { testConnection } from './ai.ts';
import { later } from './background.ts';
import { checklistFor, claimDetail, claimRows, createClaim, portalLink, stageLabels } from './claims.ts';
import { config } from './config.ts';
import { all, audit, batch, count, get, now, run, setSetting, setting, type Row } from './db.ts';
import { documentTypes } from './doctypes.ts';
import { checkInboxNow, connectInbox, disconnectInbox, inboxView, sendEmail, setAcknowledgements } from './email.ts';
import { streamFile } from './files.ts';
import { addDocument, checkUpload, FileRejected, refreshRuleChecks, removeDocument, reviewFile, fileChanged, startReading, deleteClaim } from './pipeline.ts';
import { directToStorage, received, uploadToken } from './uploads.ts';
import { claimsCsv, dashboard, workbook } from './reports.ts';
import {
  checkPassword, clearFailures, createUser, endAllSessions, endSession, ensureFirstManager, hashPassword, isLockedOut, noteAttempt, noteFailure, recentAttempts, startSession, userForSession,
} from './auth.ts';

type Env = { Variables: { user: Row } };
export const app = new Hono<Env>();

const COOKIE = 'claimsflow_session';
const password = z.string().min(10, 'Use at least 10 characters.').max(200);

// The first manager is created on the first request each copy of the app handles, once the database is reachable.
app.use('/api/*', async (_c, next) => {
  await ensureFirstManager();
  await next();
});

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  if (config.secureCookies) c.header('Strict-Transport-Security', 'max-age=31536000');
});

// The proxy in front may change the scheme, so compare hosts.
app.use('/api/*', csrf({ origin: (origin, c) => {
  try { return new URL(origin).host === c.req.header('host'); } catch { return false; }
} }));
app.use('/api/*', bodyLimit({ maxSize: 26 * 1024 * 1024 * 10, onError: (c) => c.json({ error: 'Too much was uploaded at once.' }, 413) }));

app.onError((error, c) => {
  if (error instanceof HTTPException) return error.getResponse();
  if (error instanceof z.ZodError) return c.json({ error: error.issues[0]?.message ?? 'Check what you entered.' }, 400);
  if (error instanceof FileRejected) return c.json({ error: error.message }, 400);
  console.error(error);
  return c.json({ error: 'Something went wrong on our side. Try again.' }, 500);
});

const requireUser = async (c: Context<Env>, next: Next) => {
  const user = await userForSession(getCookie(c, COOKIE));
  if (!user) return c.json({ error: 'Sign in to continue.' }, 401);
  c.set('user', user);
  await next();
};
const requireManager = async (c: Context<Env>, next: Next) => {
  if (c.get('user').role !== 'manager') return c.json({ error: 'Only a manager can do this.' }, 403);
  await next();
};

app.get('/api/health', (c) => c.json({ ok: true }));

const publicUser = (user: Row) => ({ id: user.id, email: user.email, name: user.name, role: user.role, active: Boolean(user.active) });

app.post('/api/login', async (c) => {
  const body = z.object({ email: z.string(), password: z.string() }).parse(await c.req.json());
  const email = body.email.toLowerCase().trim();
  const ip = (c.req.header('x-forwarded-for') ?? '').split(',')[0].trim();
  const key = `${email}|${ip}`;
  if (await isLockedOut(key)) return c.json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
  const user = await get('SELECT * FROM users WHERE email = ? AND active = 1', email);
  if (!user || !(await checkPassword(body.password, user.password_hash))) {
    await noteFailure(key);
    await audit(email.slice(0, 120), 'Failed sign-in');
    return c.json({ error: 'That email and password do not match.' }, 401);
  }
  await clearFailures(key);
  setCookie(c, COOKIE, await startSession(user.id), { httpOnly: true, sameSite: 'Lax', secure: config.secureCookies, path: '/', maxAge: 7 * 86400 });
  await audit(user.name, 'Signed in');
  return c.json(publicUser(user));
});

app.post('/api/logout', async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await endSession(token);
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// ---- The upload link for brokers and claimants. It needs no sign-in, so it shows only the reference and the checklist. ----
const portalByToken = (token: string | undefined) => get('SELECT * FROM claims WHERE portal_token = ? AND handed_over_at IS NULL', token);
const portalClaim = (c: Context) => portalByToken(c.req.param('token'));
const portalView = async (claim: Row) => ({
  ref: claim.ref,
  testOnly: config.freeAiPlan,
  directUploads: directToStorage(),
  checklist: (await checklistFor(claim)).map((item) => ({ label: item.label, required: item.required, received: item.documentIds.length > 0 })),
  // The review counts as reading, because it works out the type of claim and so the checklist.
  reading: (await count("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status IN ('queued','reading')", claim.id)) + (claim.analysis_status === 'running' ? 1 : 0),
  received: await count('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', claim.id),
});

app.get('/api/portal/:token', async (c) => {
  const claim = await portalClaim(c);
  return claim ? c.json(await portalView(claim)) : c.json({ error: 'This link is no longer active. Ask the claims team for a new one.' }, 404);
});

const overLimit = (name: string) => `${name} was not added, because the upload limit was reached. Contact the claims team.`;
const publicUploadsLeftToday = async () =>
  config.maxPublicDocumentsPerDay - (await count("SELECT COUNT(*) AS n FROM documents WHERE origin = 'portal' AND created_at > ?", new Date(Date.now() - 864e5).toISOString()));
const portalRoom = async (claim: Row) =>
  Math.min(config.maxPortalDocuments - (await count('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', claim.id)), await publicUploadsLeftToday());

/** Where a claim's files wait in the Blob store before they are checked. See uploads.ts. */
const claimScope = (claim: Row) => `claim-${claim.id}`;
const portalScope = (claim: Row) => `portal-${claim.portal_token}`;

async function takeUploads(c: Context, claim: Row, scope: string, origin: string, actor: string, limit = Infinity) {
  const { files } = await received(c, scope);
  if (!files.length) return c.json({ error: 'Choose at least one file.' }, 400);
  const added: string[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (added.length >= limit) {
      await file.discard();
      rejected.push(overLimit(file.name));
      continue;
    }
    try {
      await addDocument(claim, file.name, await file.read(), origin, actor);
      added.push(file.name);
    } catch (error) {
      if (!(error instanceof FileRejected)) throw error;
      rejected.push(error.message);
    }
  }
  if (added.length) startReading();
  return c.json({ added, rejected });
}

app.post('/api/portal/:token/documents', async (c) => {
  const claim = await portalClaim(c);
  if (!claim) return c.json({ error: 'This link is no longer active. Ask the claims team for a new one.' }, 404);
  const room = await portalRoom(claim);
  if (room <= 0) return c.json({ error: 'The upload limit has been reached. Try again later, or contact the claims team.' }, 429);
  return takeUploads(c, claim, portalScope(claim), 'portal', 'Upload link', room);
});

// ---- The public page where a client starts their own claim. Anyone can reach it, so it has limits. ----
const SELF_SERVICE = 'Client self-service';
const CLAIMS_PER_HOUR_PER_ADDRESS = 5;
const CLAIMS_PER_DAY = 100;
const PUBLIC_SCOPE = 'public';
const addressOf = (c: Context) => (c.req.header('x-forwarded-for') ?? 'unknown').split(',')[0].trim();

/** Why a new public claim cannot start now, or an empty string when it can. */
async function publicStartRefused(c: Context): Promise<string> {
  const starts = await recentAttempts(`start:${addressOf(c)}`, 3600_000);
  const today = await count('SELECT COUNT(*) AS n FROM claims WHERE created_by = ? AND created_at > ?', SELF_SERVICE, new Date(Date.now() - 864e5).toISOString());
  const room = Math.min(config.maxPortalDocuments, await publicUploadsLeftToday());
  return starts >= CLAIMS_PER_HOUR_PER_ADDRESS || today >= CLAIMS_PER_DAY || room <= 0
    ? 'Too many claims have been started. Try again later, or contact the claims team.'
    : '';
}

app.get('/api/public/claim-form', (c) => c.json({ testOnly: config.freeAiPlan, directUploads: directToStorage() }));

// On Vercel the browser uploads each file straight to storage. This hands out a token for one file, to whoever may add it.
const UPLOAD_TOKENS_PER_HOUR_PER_ADDRESS = 120;
app.post('/api/uploads', (c) =>
  uploadToken(c, async (scope) => {
    if (scope === PUBLIC_SCOPE || scope.startsWith('portal-')) {
      // Each token lets someone put up to 25 MB in storage, so people without an account get only so many.
      const key = `upload-token:${addressOf(c)}`;
      if ((await recentAttempts(key, 3600_000)) >= UPLOAD_TOKENS_PER_HOUR_PER_ADDRESS) return false;
      await noteAttempt(key);
    }
    if (scope === PUBLIC_SCOPE) return !(await publicStartRefused(c));
    if (scope.startsWith('portal-')) {
      const claim = await portalByToken(scope.slice('portal-'.length));
      return Boolean(claim && (await portalRoom(claim)) > 0);
    }
    if (scope.startsWith('claim-')) {
      const user = await userForSession(getCookie(c, COOKIE));
      return Boolean(user && (await get('SELECT 1 AS x FROM claims WHERE id = ?', scope.slice('claim-'.length))));
    }
    return false;
  }),
);

// Clients only upload. The AI takes the claim's details from the documents, and the claim exists only once a usable file has arrived.
app.post('/api/public/claims', async (c) => {
  const { fields, files } = await received(c, PUBLIC_SCOPE);
  const discardAll = () => Promise.all(files.map((file) => file.discard()));
  if (fields.website) {
    await discardAll();
    return c.json({ error: 'Something went wrong. Try again.' }, 400);
  }
  if (fields.consent !== 'true') {
    await discardAll();
    return c.json({ error: 'Please tick the box so we can process your documents.' }, 400);
  }
  if (!files.length) return c.json({ error: 'Choose at least one file.' }, 400);

  const refused = await publicStartRefused(c);
  if (refused) {
    await discardAll();
    return c.json({ error: refused }, 429);
  }
  const room = Math.min(config.maxPortalDocuments, await publicUploadsLeftToday());

  const usable: { name: string; data: Buffer }[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (usable.length >= room) {
      await file.discard();
      rejected.push(overLimit(file.name));
      continue;
    }
    const data = await file.read();
    try {
      checkUpload(file.name, data);
      usable.push({ name: file.name, data });
    } catch (error) {
      if (!(error instanceof FileRejected)) throw error;
      rejected.push(error.message);
    }
  }
  if (!usable.length) return c.json({ error: rejected.join(' ') }, 400);

  await noteAttempt(`start:${addressOf(c)}`);
  const claim = await createClaim({ source: SELF_SERVICE }, SELF_SERVICE);
  for (const { name, data } of usable) await addDocument(claim, name, data, 'portal', 'Upload link');
  startReading();
  return c.json({ token: claim.portal_token, rejected }, 201);
});

// ---- Everything below needs a signed-in member of staff. ----
const staff = new Hono<Env>();
staff.use('*', requireUser);

staff.get('/me', (c) => c.json(publicUser(c.get('user'))));

staff.post('/me/password', async (c) => {
  const body = z.object({ current: z.string(), next: password }).parse(await c.req.json());
  const user = c.get('user');
  if (!(await checkPassword(body.current, user.password_hash))) return c.json({ error: 'Your current password is not right.' }, 400);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(body.next), user.id);
  await audit(user.name, 'Changed own password');
  return c.json({ ok: true });
});

staff.get('/meta', async (c) => c.json({
  documentTypes,
  stages: stageLabels,
  directUploads: directToStorage(),
  classes: await all('SELECT id, name FROM classes ORDER BY name'),
  ai: config.aiConfigured,
  aiName: config.provider === 'gemini' ? "Google's Gemini" : "Anthropic's Claude",
  freeAiPlan: config.freeAiPlan,
  sending: Boolean(config.smtp),
}));

const claimById = (id: string) => get('SELECT * FROM claims WHERE id = ?', id);

staff.get('/claims', async (c) => {
  const q = (c.req.query('q') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const stage = c.req.query('stage');
  const rows = (await claimRows(await all('SELECT * FROM claims ORDER BY updated_at DESC'), true))
    .filter((row) => !stage || row.stage === stage)
    .filter((row) => !q || [row.ref, row.claimantName, row.policyNumber, row.vehicleReg, row.source].some((v) => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '').includes(q)));
  return c.json(rows);
});

const date = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use a full date.');
const ClaimInput = z.object({
  class_id: z.string().nullable(), claimant_name: z.string().max(200), contact_email: z.union([z.literal(''), z.string().email('Enter a valid email address.')]), contact_phone: z.string().max(40),
  policy_number: z.string().max(100), vehicle_reg: z.string().max(40), policy_start: date, policy_end: date, loss_date: date,
  source: z.string().max(200), notes: z.string().max(4000),
}).partial();

staff.post('/claims', async (c) => {
  const input = ClaimInput.parse(await c.req.json());
  return c.json(await claimDetail(await createClaim(input, c.get('user').name)), 201);
});

staff.get('/claims/:id', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  if (!c.req.query('refresh')) await audit(c.get('user').name, 'Viewed claim', claim.ref);
  return c.json(await claimDetail(claim));
});

staff.patch('/claims/:id', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const input = ClaimInput.parse(await c.req.json());
  const keys = Object.keys(input) as (keyof typeof input)[];
  if (keys.length) {
    await run(`UPDATE claims SET ${keys.map((key) => `${key} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((key) => input[key] ?? null), now(), claim.id);
    await audit(c.get('user').name, 'Edited claim details', claim.ref, keys.join(', '));
    await refreshRuleChecks(claim.id);
  }
  return c.json(await claimDetail((await claimById(claim.id))!));
});

staff.delete('/claims/:id', requireManager, async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  await deleteClaim(claim);
  await audit(c.get('user').name, 'Deleted claim and its documents', claim.ref);
  return c.json({ ok: true });
});

staff.post('/claims/:id/documents', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  return takeUploads(c, claim, claimScope(claim), 'upload', c.get('user').name);
});

staff.post('/claims/:id/review', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  if (!config.aiConfigured) return c.json({ error: 'The AI is not connected yet. A manager needs to add the key.' }, 409);
  later(reviewFile(claim.id));
  await audit(c.get('user').name, 'Asked for the file to be reviewed again', claim.ref);
  return c.json({ ok: true });
});

staff.post('/claims/:id/handover', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const handover = z.object({ handedOver: z.boolean() }).parse(await c.req.json()).handedOver;
  await run('UPDATE claims SET handed_over_at = ?, updated_at = ? WHERE id = ?', handover ? now() : null, now(), claim.id);
  await audit(c.get('user').name, handover ? 'Handed file to claims officer' : 'Reopened file', claim.ref);
  return c.json(await claimDetail((await claimById(claim.id))!));
});

staff.post('/claims/:id/portal', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  await run('UPDATE claims SET portal_token = ? WHERE id = ?', token, claim.id);
  await audit(c.get('user').name, 'Replaced upload link', claim.ref);
  return c.json(await claimDetail((await claimById(claim.id))!));
});

const Draft = z.object({ subject: z.string().min(1, 'Add a subject.').max(300), body: z.string().min(1, 'Write the email first.').max(10000) });

staff.put('/claims/:id/draft', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const draft = Draft.parse(await c.req.json());
  await run('UPDATE claims SET draft_subject = ?, draft_body = ?, draft_edited = 1 WHERE id = ?', draft.subject, draft.body, claim.id);
  await audit(c.get('user').name, 'Edited the request email', claim.ref);
  return c.json(await claimDetail((await claimById(claim.id))!));
});

// Nothing goes out until a person presses this. `viaOwnEmail` records a request sent from the handler's own mail app.
staff.post('/claims/:id/draft/approve', async (c) => {
  const claim = await claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const body = Draft.extend({ to: z.string().email('Enter a valid email address.'), viaOwnEmail: z.boolean() }).parse(await c.req.json());
  if (!body.viaOwnEmail) {
    if (!config.smtp) return c.json({ error: 'Sending is not set up, so send it from your own email.' }, 409);
    try {
      await sendEmail(body.to, body.subject, `${body.body}\n\nUpload the documents here:\n${portalLink(claim)}`);
    } catch (error) {
      console.error(error);
      return c.json({ error: 'The email could not be sent. Check the mail settings, or send it from your own email.' }, 502);
    }
  }
  await run('UPDATE claims SET draft_subject = ?, draft_body = ?, draft_edited = 1, draft_sent_at = ?, contact_email = ?, updated_at = ? WHERE id = ?', body.subject, body.body, now(), body.to, now(), claim.id);
  await audit(c.get('user').name, 'Approved and sent the request email', claim.ref, `To ${body.to}${body.viaOwnEmail ? ', from own email' : ''}`);
  return c.json(await claimDetail((await claimById(claim.id))!));
});

const docById = (id: string) => get('SELECT d.*, c.ref FROM documents d JOIN claims c ON c.id = d.claim_id WHERE d.id = ?', id);

staff.get('/documents/:id/file', async (c) => {
  const doc = await docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  await audit(c.get('user').name, 'Opened document', doc.ref, doc.filename);
  const name = doc.filename.replace(/[^\w.\- ]/g, '_');
  // Streamed, so a large document is not held whole in memory.
  return c.body(await streamFile(doc.id), 200, {
    'Content-Type': doc.mime,
    // Browsers can show these. Anything else downloads, to open in Word or Excel.
    'Content-Disposition': `${/^(application\/pdf|image\/(jpeg|png|webp)|text\/plain)$/.test(doc.mime) ? 'inline' : 'attachment'}; filename="${name}"`,
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; object-src 'self'; frame-ancestors 'self'",
  });
});

staff.patch('/documents/:id', async (c) => {
  const doc = await docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  const body = z.object({
    docType: z.string().refine((value) => value in documentTypes, 'Choose a label from the list.').optional(),
    field: z.object({ index: z.number().int().min(0), value: z.string().max(500) }).optional(),
  }).parse(await c.req.json());
  const user = c.get('user').name;
  if (body.docType) {
    await run("UPDATE documents SET doc_type = ?, type_set_by = 'person', status = CASE WHEN status = 'failed' THEN 'done' ELSE status END, error = CASE WHEN status = 'failed' THEN '' ELSE error END WHERE id = ?", body.docType, doc.id);
    await audit(user, 'Corrected document label', doc.ref, `${doc.filename}: ${documentTypes[body.docType]}`);
  }
  if (body.field) {
    const fields = JSON.parse(doc.fields_json);
    const field = fields[body.field.index];
    if (!field) return c.json({ error: 'That detail no longer exists.' }, 404);
    await audit(user, 'Corrected extracted detail', doc.ref, `${field.label}: "${field.value}" to "${body.field.value}"`);
    Object.assign(field, { value: body.field.value, confidence: 'high', corrected: true });
    await run('UPDATE documents SET fields_json = ? WHERE id = ?', JSON.stringify(fields), doc.id);
  }
  await fileChanged(doc.claim_id);
  return c.json(await claimDetail((await claimById(doc.claim_id))!));
});

staff.post('/documents/:id/retry', async (c) => {
  const doc = await docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  await run("UPDATE documents SET status = 'queued', error = '' WHERE id = ?", doc.id);
  await audit(c.get('user').name, 'Asked for a document to be read again', doc.ref, doc.filename);
  startReading();
  return c.json(await claimDetail((await claimById(doc.claim_id))!));
});

staff.delete('/documents/:id', async (c) => {
  const doc = await docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  await removeDocument(doc);
  await audit(c.get('user').name, 'Removed document', doc.ref, doc.filename);
  await fileChanged(doc.claim_id);
  return c.json(await claimDetail((await claimById(doc.claim_id))!));
});

staff.patch('/flags/:id', async (c) => {
  const flag = await get('SELECT f.*, c.ref FROM flags f JOIN claims c ON c.id = f.claim_id WHERE f.id = ?', c.req.param('id'));
  if (!flag) return c.json({ error: 'Flag not found.' }, 404);
  const body = z.object({ status: z.enum(['open', 'dismissed', 'resolved']), note: z.string().max(1000).default('') }).parse(await c.req.json());
  const user = c.get('user').name;
  await run('UPDATE flags SET status = ?, note = ?, resolved_by = ? WHERE id = ?', body.status, body.note, body.status === 'open' ? null : user, flag.id);
  await audit(user, `Marked flag ${body.status}`, flag.ref, `${flag.title}${body.note ? `. Note: ${body.note}` : ''}`);
  return c.json(await claimDetail((await claimById(flag.claim_id))!));
});

staff.get('/dashboard', async (c) => c.json(await dashboard()));

const dated = () => new Date().toISOString().slice(0, 10);
staff.get('/export/claims.csv', async (c) => {
  await audit(c.get('user').name, 'Exported claims', null, 'CSV');
  return c.body(`\uFEFF${await claimsCsv()}`, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="claimsflow-${dated()}.csv"` });
});
staff.get('/export/claims.xlsx', async (c) => {
  await audit(c.get('user').name, 'Exported claims', null, 'Excel');
  return c.body(new Uint8Array(await workbook()), 200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="claimsflow-${dated()}.xlsx"`,
  });
});

// ---- Checklists ----
staff.get('/classes', async (c) => {
  const [classes, items] = await Promise.all([
    all('SELECT id, name FROM classes ORDER BY name'),
    all('SELECT class_id, doc_type AS type, required FROM checklist_items ORDER BY position'),
  ]);
  return c.json(classes.map((row) => ({
    ...row,
    items: items.filter((item) => item.class_id === row.id).map((item) => ({ type: item.type, required: Boolean(item.required) })),
  })));
});

staff.post('/classes', requireManager, async (c) => {
  const { name } = z.object({ name: z.string().trim().min(2, 'Name the class of business.').max(80) }).parse(await c.req.json());
  if (await get('SELECT 1 AS x FROM classes WHERE lower(name) = lower(?)', name)) return c.json({ error: 'That class already exists.' }, 409);
  const id = crypto.randomUUID();
  await run('INSERT INTO classes (id, name) VALUES (?, ?)', id, name);
  await audit(c.get('user').name, 'Added class of business', null, name);
  return c.json({ id, name, items: [] }, 201);
});

staff.put('/classes/:id/checklist', requireManager, async (c) => {
  const cls = await get('SELECT * FROM classes WHERE id = ?', c.req.param('id'));
  if (!cls) return c.json({ error: 'Class not found.' }, 404);
  const items = z.array(z.object({ type: z.string().refine((value) => value in documentTypes), required: z.boolean() })).parse(await c.req.json());
  await batch([
    ['DELETE FROM checklist_items WHERE class_id = ?', cls.id],
    ...items.map((item, position): [string, ...unknown[]] => ['INSERT INTO checklist_items (class_id, doc_type, required, position) VALUES (?, ?, ?, ?)', cls.id, item.type, item.required ? 1 : 0, position]),
  ]);
  await audit(c.get('user').name, 'Changed checklist', null, cls.name);
  return c.json({ ok: true });
});

// ---- Team, audit and settings: managers only ----
staff.get('/users', requireManager, async (c) => c.json((await all('SELECT * FROM users ORDER BY name')).map(publicUser)));

staff.post('/users', requireManager, async (c) => {
  const body = z.object({ email: z.string().email('Enter a valid email address.'), name: z.string().trim().min(1, 'Add their name.').max(120), role: z.enum(['manager', 'handler']), password }).parse(await c.req.json());
  if (await get('SELECT 1 AS x FROM users WHERE email = ?', body.email.toLowerCase().trim())) return c.json({ error: 'That email already has an account.' }, 409);
  const user = await createUser(body.email, body.name, body.role, body.password);
  await audit(c.get('user').name, 'Added team member', null, `${user.email} (${user.role})`);
  return c.json(publicUser(user), 201);
});

staff.patch('/users/:id', requireManager, async (c) => {
  const target = await get('SELECT * FROM users WHERE id = ?', c.req.param('id'));
  if (!target) return c.json({ error: 'Person not found.' }, 404);
  const body = z.object({ role: z.enum(['manager', 'handler']).optional(), active: z.boolean().optional(), password: password.optional() }).parse(await c.req.json());
  const staysManager = (body.role ?? target.role) === 'manager' && (body.active ?? Boolean(target.active));
  if (target.role === 'manager' && target.active && !staysManager) {
    const managers = await count("SELECT COUNT(*) AS n FROM users WHERE role = 'manager' AND active = 1");
    if (managers <= 1) return c.json({ error: 'There must always be at least one manager.' }, 409);
  }
  if (body.role) await run('UPDATE users SET role = ? WHERE id = ?', body.role, target.id);
  if (body.active !== undefined) await run('UPDATE users SET active = ? WHERE id = ?', body.active ? 1 : 0, target.id);
  if (body.password) await run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(body.password), target.id);
  if (body.password || body.active === false) await endAllSessions(target.id);
  await audit(c.get('user').name, 'Changed team member', null, `${target.email}: ${Object.keys(body).join(', ')}`);
  return c.json(publicUser((await get('SELECT * FROM users WHERE id = ?', target.id))!));
});

staff.get('/audit', requireManager, async (c) => {
  const claim = c.req.query('claim');
  const rows = claim
    ? await all('SELECT * FROM audit WHERE claim_ref = ? ORDER BY id DESC LIMIT 500', claim)
    : await all('SELECT * FROM audit ORDER BY id DESC LIMIT 500');
  return c.json(rows);
});

staff.get('/settings', requireManager, async (c) => c.json({ retentionDays: Number(await setting('retention_days', '0')) }));

staff.put('/settings', requireManager, async (c) => {
  const { retentionDays } = z.object({ retentionDays: z.number().int().min(0).max(36500) }).parse(await c.req.json());
  await setSetting('retention_days', String(retentionDays));
  await audit(c.get('user').name, 'Changed retention period', null, retentionDays ? `${retentionDays} days` : 'Keep until deleted');
  return c.json({ retentionDays });
});

staff.get('/settings/inbox', requireManager, async (c) => c.json(await inboxView()));

staff.put('/settings/inbox', requireManager, async (c) => {
  const input = z.object({
    host: z.string().trim().max(200).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    user: z.string().trim().email('Enter the mailbox email address.').max(200),
    password: z.string().max(500),
    mailbox: z.string().trim().max(200).optional(),
  }).parse(await c.req.json());
  const problem = await connectInbox({ ...input, mailbox: input.mailbox || 'INBOX' });
  if (problem) return c.json({ error: problem }, 400);
  await audit(c.get('user').name, 'Connected claims inbox', null, input.user);
  return c.json(await inboxView());
});

staff.put('/settings/inbox/acknowledge', requireManager, async (c) => {
  const { on } = z.object({ on: z.boolean() }).parse(await c.req.json());
  await setAcknowledgements(on);
  await audit(c.get('user').name, on ? 'Turned on automatic replies to senders' : 'Turned off automatic replies to senders');
  return c.json(await inboxView());
});

staff.post('/settings/inbox/check', requireManager, async (c) => {
  await checkInboxNow();
  await audit(c.get('user').name, 'Checked claims inbox');
  return c.json(await inboxView());
});

staff.delete('/settings/inbox', requireManager, async (c) => {
  await disconnectInbox();
  await audit(c.get('user').name, 'Disconnected claims inbox');
  return c.json(await inboxView());
});

staff.post('/settings/test-ai', requireManager, async (c) => {
  if (!config.aiConfigured) return c.json({ ok: false, message: 'No AI key has been added yet.' });
  try {
    const model = await testConnection();
    return c.json({ ok: true, message: `Connected. Reading with ${model}.` });
  } catch (error) {
    console.error(error);
    const status = (error as { status?: number }).status;
    return c.json({ ok: false, message: status === 401 || status === 403 ? 'The key was refused. Check it and add it again.' : `The AI could not be reached${status ? ` (error ${status})` : ''}.` });
  }
});

// ---- Scheduled work. Vercel (daily on Hobby) or an outside scheduler calls this, with CRON_SECRET as a bearer token. ----
app.get('/api/cron/tick', async (c) => {
  if (!config.cronSecret) {
    if (config.onVercel) return c.json({ error: 'Set CRON_SECRET in the Vercel project settings.' }, 503);
  } else if (c.req.header('authorization') !== `Bearer ${config.cronSecret}`) {
    return c.json({ error: 'Not allowed.' }, 401);
  }
  const { tick } = await import('./tick.ts');
  // Outside schedulers such as cron-job.org stop waiting after about 30 seconds, so reply at once and work on after.
  // ?wait=1 waits for the result instead.
  if (!c.req.query('wait')) {
    later(tick());
    return c.json({ ok: true, started: true }, 202);
  }
  const problems = await tick();
  return c.json({ ok: !problems.length, problems });
});

app.route('/api', staff);
app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));
