import { Hono, type Context, type Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { z } from 'zod';
import { testConnection } from './ai.ts';
import { checklistFor, claimDetail, claimRow, createClaim, portalLink, stageLabels } from './claims.ts';
import { config } from './config.ts';
import { all, audit, get, now, run, setSetting, setting, type Row } from './db.ts';
import { documentTypes } from './doctypes.ts';
import { checkInboxNow, connectInbox, disconnectInbox, inboxView, sendEmail } from './email.ts';
import { readFile } from './files.ts';
import { addDocument, checkUpload, FileRejected, pump, refreshRuleChecks, removeDocument, reviewFile, scheduleReview } from './pipeline.ts';
import { claimsCsv, dashboard, workbook } from './reports.ts';
import {
  checkPassword, clearFailures, createUser, endAllSessions, endSession, hashPassword, isLockedOut, noteFailure, startSession, userForSession,
} from './auth.ts';

type Env = { Variables: { user: Row } };
export const app = new Hono<Env>();

const COOKIE = 'claimsflow_session';
const password = z.string().min(10, 'Use at least 10 characters.').max(200);

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
  const user = userForSession(getCookie(c, COOKIE));
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
  if (isLockedOut(key)) return c.json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
  const user = get('SELECT * FROM users WHERE email = ? AND active = 1', email);
  if (!user || !(await checkPassword(body.password, user.password_hash))) {
    noteFailure(key);
    audit(email.slice(0, 120), 'Failed sign-in');
    return c.json({ error: 'That email and password do not match.' }, 401);
  }
  clearFailures(key);
  setCookie(c, COOKIE, startSession(user.id), { httpOnly: true, sameSite: 'Lax', secure: config.secureCookies, path: '/', maxAge: 7 * 86400 });
  audit(user.name, 'Signed in');
  return c.json(publicUser(user));
});

app.post('/api/logout', (c) => {
  const token = getCookie(c, COOKIE);
  if (token) endSession(token);
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// ---- The upload link for brokers and claimants. It needs no sign-in, so it shows only the reference and the checklist. ----
const portalClaim = (c: Context) => get('SELECT * FROM claims WHERE portal_token = ? AND handed_over_at IS NULL', c.req.param('token'));
const portalView = (claim: Row) => ({
  ref: claim.ref,
  testOnly: config.freeAiPlan,
  checklist: checklistFor(claim).map((item) => ({ label: item.label, required: item.required, received: item.documentIds.length > 0 })),
  // The review counts as reading, because it works out the type of claim and so the checklist.
  reading: get("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status IN ('queued','reading')", claim.id)!.n + (claim.analysis_status === 'running' ? 1 : 0),
  received: get('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', claim.id)!.n,
});

app.get('/api/portal/:token', (c) => {
  const claim = portalClaim(c);
  return claim ? c.json(portalView(claim)) : c.json({ error: 'This link is no longer active. Ask the claims team for a new one.' }, 404);
});

const filesIn = (form: Record<string, unknown>) => ([] as unknown[]).concat(form.files ?? []).filter((file): file is File => file instanceof File);
const overLimit = (name: string) => `${name} was not added, because the upload limit was reached. Contact the claims team.`;
const publicUploadsLeftToday = () =>
  config.maxPublicDocumentsPerDay - get("SELECT COUNT(*) AS n FROM documents WHERE origin = 'portal' AND created_at > ?", new Date(Date.now() - 864e5).toISOString())!.n;

async function takeUploads(c: Context, claim: Row, origin: string, actor: string, limit = Infinity) {
  const files = filesIn(await c.req.parseBody({ all: true }));
  if (!files.length) return c.json({ error: 'Choose at least one file.' }, 400);
  const added: string[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (added.length >= limit) {
      rejected.push(overLimit(file.name));
      continue;
    }
    try {
      addDocument(claim, file.name, Buffer.from(await file.arrayBuffer()), origin, actor);
      added.push(file.name);
    } catch (error) {
      if (!(error instanceof FileRejected)) throw error;
      rejected.push(error.message);
    }
  }
  return c.json({ added, rejected });
}

app.post('/api/portal/:token/documents', async (c) => {
  const claim = portalClaim(c);
  if (!claim) return c.json({ error: 'This link is no longer active. Ask the claims team for a new one.' }, 404);
  const count = get('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', claim.id)!.n;
  const room = Math.min(config.maxPortalDocuments - count, publicUploadsLeftToday());
  if (room <= 0) return c.json({ error: 'The upload limit has been reached. Try again later, or contact the claims team.' }, 429);
  return takeUploads(c, claim, 'portal', 'Upload link', room);
});

// ---- The public page where a client starts their own claim. Anyone can reach it, so it has limits. ----
const SELF_SERVICE = 'Client self-service';
const CLAIMS_PER_HOUR_PER_ADDRESS = 5;
const CLAIMS_PER_DAY = 100;
const recentStarts = new Map<string, number[]>();

app.get('/api/public/claim-form', (c) => c.json({ testOnly: config.freeAiPlan }));

// Clients only upload. The AI takes the claim's details from the documents, and the claim exists only once a usable file has arrived.
app.post('/api/public/claims', async (c) => {
  const form = await c.req.parseBody({ all: true });
  if (form.website) return c.json({ error: 'Something went wrong. Try again.' }, 400);
  if (form.consent !== 'true') return c.json({ error: 'Please tick the box so we can process your documents.' }, 400);
  const files = filesIn(form);
  if (!files.length) return c.json({ error: 'Choose at least one file.' }, 400);

  const address = (c.req.header('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const hourAgo = Date.now() - 3600_000;
  const starts = (recentStarts.get(address) ?? []).filter((at) => at > hourAgo);
  const today = get('SELECT COUNT(*) AS n FROM claims WHERE created_by = ? AND created_at > ?', SELF_SERVICE, new Date(Date.now() - 864e5).toISOString())!.n;
  const room = Math.min(config.maxPortalDocuments, publicUploadsLeftToday());
  if (starts.length >= CLAIMS_PER_HOUR_PER_ADDRESS || today >= CLAIMS_PER_DAY || room <= 0) {
    return c.json({ error: 'Too many claims have been started. Try again later, or contact the claims team.' }, 429);
  }

  const usable: { name: string; data: Buffer }[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (usable.length >= room) {
      rejected.push(overLimit(file.name));
      continue;
    }
    const data = Buffer.from(await file.arrayBuffer());
    try {
      checkUpload(file.name, data);
      usable.push({ name: file.name, data });
    } catch (error) {
      if (!(error instanceof FileRejected)) throw error;
      rejected.push(error.message);
    }
  }
  if (!usable.length) return c.json({ error: rejected.join(' ') }, 400);

  recentStarts.set(address, [...starts, Date.now()]);
  const claim = createClaim({ source: SELF_SERVICE }, SELF_SERVICE);
  for (const { name, data } of usable) addDocument(claim, name, data, 'portal', 'Upload link');
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
  run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(body.next), user.id);
  audit(user.name, 'Changed own password');
  return c.json({ ok: true });
});

staff.get('/meta', (c) => c.json({
  documentTypes,
  stages: stageLabels,
  classes: all('SELECT id, name FROM classes ORDER BY name'),
  ai: config.aiConfigured,
  aiName: config.provider === 'gemini' ? "Google's Gemini" : "Anthropic's Claude",
  freeAiPlan: config.freeAiPlan,
  sending: Boolean(config.smtp),
}));

const claimById = (id: string) => get('SELECT * FROM claims WHERE id = ?', id);

staff.get('/claims', (c) => {
  const q = (c.req.query('q') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const stage = c.req.query('stage');
  const rows = all('SELECT * FROM claims ORDER BY updated_at DESC')
    .map((claim) => claimRow(claim))
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
  return c.json(claimDetail(createClaim(input, c.get('user').name)), 201);
});

staff.get('/claims/:id', (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  if (!c.req.query('refresh')) audit(c.get('user').name, 'Viewed claim', claim.ref);
  return c.json(claimDetail(claim));
});

staff.patch('/claims/:id', async (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const input = ClaimInput.parse(await c.req.json());
  const keys = Object.keys(input) as (keyof typeof input)[];
  if (keys.length) {
    run(`UPDATE claims SET ${keys.map((key) => `${key} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((key) => input[key] ?? null), now(), claim.id);
    audit(c.get('user').name, 'Edited claim details', claim.ref, keys.join(', '));
    refreshRuleChecks(claim.id);
  }
  return c.json(claimDetail(claimById(claim.id)!));
});

staff.delete('/claims/:id', requireManager, (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  all('SELECT id FROM documents WHERE claim_id = ?', claim.id).forEach(removeDocument);
  run('DELETE FROM claims WHERE id = ?', claim.id);
  audit(c.get('user').name, 'Deleted claim and its documents', claim.ref);
  return c.json({ ok: true });
});

staff.post('/claims/:id/documents', async (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  return takeUploads(c, claim, 'upload', c.get('user').name);
});

staff.post('/claims/:id/review', (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  if (!config.aiConfigured) return c.json({ error: 'The AI is not connected yet. A manager needs to add the key.' }, 409);
  void reviewFile(claim.id);
  audit(c.get('user').name, 'Asked for the file to be reviewed again', claim.ref);
  return c.json({ ok: true });
});

staff.post('/claims/:id/handover', async (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const handover = z.object({ handedOver: z.boolean() }).parse(await c.req.json()).handedOver;
  run('UPDATE claims SET handed_over_at = ?, updated_at = ? WHERE id = ?', handover ? now() : null, now(), claim.id);
  audit(c.get('user').name, handover ? 'Handed file to claims officer' : 'Reopened file', claim.ref);
  return c.json(claimDetail(claimById(claim.id)!));
});

staff.post('/claims/:id/portal', (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  run('UPDATE claims SET portal_token = ? WHERE id = ?', token, claim.id);
  audit(c.get('user').name, 'Replaced upload link', claim.ref);
  return c.json(claimDetail(claimById(claim.id)!));
});

const Draft = z.object({ subject: z.string().min(1, 'Add a subject.').max(300), body: z.string().min(1, 'Write the email first.').max(10000) });

staff.put('/claims/:id/draft', async (c) => {
  const claim = claimById(c.req.param('id')!);
  if (!claim) return c.json({ error: 'Claim not found.' }, 404);
  const draft = Draft.parse(await c.req.json());
  run('UPDATE claims SET draft_subject = ?, draft_body = ?, draft_edited = 1 WHERE id = ?', draft.subject, draft.body, claim.id);
  audit(c.get('user').name, 'Edited the request email', claim.ref);
  return c.json(claimDetail(claimById(claim.id)!));
});

// Nothing goes out until a person presses this. `viaOwnEmail` records a request sent from the handler's own mail app.
staff.post('/claims/:id/draft/approve', async (c) => {
  const claim = claimById(c.req.param('id')!);
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
  run('UPDATE claims SET draft_subject = ?, draft_body = ?, draft_edited = 1, draft_sent_at = ?, contact_email = ?, updated_at = ? WHERE id = ?', body.subject, body.body, now(), body.to, now(), claim.id);
  audit(c.get('user').name, 'Approved and sent the request email', claim.ref, `To ${body.to}${body.viaOwnEmail ? ', from own email' : ''}`);
  return c.json(claimDetail(claimById(claim.id)!));
});

const docById = (id: string) => get('SELECT d.*, c.ref FROM documents d JOIN claims c ON c.id = d.claim_id WHERE d.id = ?', id);

staff.get('/documents/:id/file', (c) => {
  const doc = docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  audit(c.get('user').name, 'Opened document', doc.ref, doc.filename);
  const name = doc.filename.replace(/[^\w.\- ]/g, '_');
  return c.body(new Uint8Array(readFile(doc.id)), 200, {
    'Content-Type': doc.mime,
    // Browsers can show these. Anything else downloads, to open in Word or Excel.
    'Content-Disposition': `${/^(application\/pdf|image\/(jpeg|png|webp)|text\/plain)$/.test(doc.mime) ? 'inline' : 'attachment'}; filename="${name}"`,
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; object-src 'self'; frame-ancestors 'self'",
  });
});

staff.patch('/documents/:id', async (c) => {
  const doc = docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  const body = z.object({
    docType: z.string().refine((value) => value in documentTypes, 'Choose a label from the list.').optional(),
    field: z.object({ index: z.number().int().min(0), value: z.string().max(500) }).optional(),
  }).parse(await c.req.json());
  const user = c.get('user').name;
  if (body.docType) {
    run("UPDATE documents SET doc_type = ?, type_set_by = 'person', status = CASE WHEN status = 'failed' THEN 'done' ELSE status END, error = CASE WHEN status = 'failed' THEN '' ELSE error END WHERE id = ?", body.docType, doc.id);
    audit(user, 'Corrected document label', doc.ref, `${doc.filename}: ${documentTypes[body.docType]}`);
  }
  if (body.field) {
    const fields = JSON.parse(doc.fields_json);
    const field = fields[body.field.index];
    if (!field) return c.json({ error: 'That detail no longer exists.' }, 404);
    audit(user, 'Corrected extracted detail', doc.ref, `${field.label}: "${field.value}" to "${body.field.value}"`);
    Object.assign(field, { value: body.field.value, confidence: 'high', corrected: true });
    run('UPDATE documents SET fields_json = ? WHERE id = ?', JSON.stringify(fields), doc.id);
  }
  scheduleReview(doc.claim_id);
  return c.json(claimDetail(claimById(doc.claim_id)!));
});

staff.post('/documents/:id/retry', (c) => {
  const doc = docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  run("UPDATE documents SET status = 'queued', error = '' WHERE id = ?", doc.id);
  audit(c.get('user').name, 'Asked for a document to be read again', doc.ref, doc.filename);
  pump();
  return c.json(claimDetail(claimById(doc.claim_id)!));
});

staff.delete('/documents/:id', (c) => {
  const doc = docById(c.req.param('id')!);
  if (!doc) return c.json({ error: 'Document not found.' }, 404);
  removeDocument(doc);
  audit(c.get('user').name, 'Removed document', doc.ref, doc.filename);
  scheduleReview(doc.claim_id);
  return c.json(claimDetail(claimById(doc.claim_id)!));
});

staff.patch('/flags/:id', async (c) => {
  const flag = get('SELECT f.*, c.ref FROM flags f JOIN claims c ON c.id = f.claim_id WHERE f.id = ?', c.req.param('id'));
  if (!flag) return c.json({ error: 'Flag not found.' }, 404);
  const body = z.object({ status: z.enum(['open', 'dismissed', 'resolved']), note: z.string().max(1000).default('') }).parse(await c.req.json());
  const user = c.get('user').name;
  run('UPDATE flags SET status = ?, note = ?, resolved_by = ? WHERE id = ?', body.status, body.note, body.status === 'open' ? null : user, flag.id);
  audit(user, `Marked flag ${body.status}`, flag.ref, `${flag.title}${body.note ? `. Note: ${body.note}` : ''}`);
  return c.json(claimDetail(claimById(flag.claim_id)!));
});

staff.get('/dashboard', (c) => c.json(dashboard()));

const dated = () => new Date().toISOString().slice(0, 10);
staff.get('/export/claims.csv', (c) => {
  audit(c.get('user').name, 'Exported claims', null, 'CSV');
  return c.body(`\uFEFF${claimsCsv()}`, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="claimsflow-${dated()}.csv"` });
});
staff.get('/export/claims.xlsx', async (c) => {
  audit(c.get('user').name, 'Exported claims', null, 'Excel');
  return c.body(new Uint8Array(await workbook()), 200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="claimsflow-${dated()}.xlsx"`,
  });
});

// ---- Checklists ----
staff.get('/classes', (c) => c.json(all('SELECT id, name FROM classes ORDER BY name').map((row) => ({
  ...row,
  items: all('SELECT doc_type AS type, required FROM checklist_items WHERE class_id = ? ORDER BY position', row.id).map((item) => ({ type: item.type, required: Boolean(item.required) })),
}))));

staff.post('/classes', requireManager, async (c) => {
  const { name } = z.object({ name: z.string().trim().min(2, 'Name the class of business.').max(80) }).parse(await c.req.json());
  if (get('SELECT 1 AS x FROM classes WHERE lower(name) = lower(?)', name)) return c.json({ error: 'That class already exists.' }, 409);
  const id = crypto.randomUUID();
  run('INSERT INTO classes (id, name) VALUES (?, ?)', id, name);
  audit(c.get('user').name, 'Added class of business', null, name);
  return c.json({ id, name, items: [] }, 201);
});

staff.put('/classes/:id/checklist', requireManager, async (c) => {
  const cls = get('SELECT * FROM classes WHERE id = ?', c.req.param('id'));
  if (!cls) return c.json({ error: 'Class not found.' }, 404);
  const items = z.array(z.object({ type: z.string().refine((value) => value in documentTypes), required: z.boolean() })).parse(await c.req.json());
  run('DELETE FROM checklist_items WHERE class_id = ?', cls.id);
  items.forEach((item, position) => run('INSERT INTO checklist_items (class_id, doc_type, required, position) VALUES (?, ?, ?, ?)', cls.id, item.type, item.required ? 1 : 0, position));
  audit(c.get('user').name, 'Changed checklist', null, cls.name);
  return c.json({ ok: true });
});

// ---- Team, audit and settings: managers only ----
staff.get('/users', requireManager, (c) => c.json(all('SELECT * FROM users ORDER BY name').map(publicUser)));

staff.post('/users', requireManager, async (c) => {
  const body = z.object({ email: z.string().email('Enter a valid email address.'), name: z.string().trim().min(1, 'Add their name.').max(120), role: z.enum(['manager', 'handler']), password }).parse(await c.req.json());
  if (get('SELECT 1 AS x FROM users WHERE email = ?', body.email.toLowerCase().trim())) return c.json({ error: 'That email already has an account.' }, 409);
  const user = await createUser(body.email, body.name, body.role, body.password);
  audit(c.get('user').name, 'Added team member', null, `${user.email} (${user.role})`);
  return c.json(publicUser(user), 201);
});

staff.patch('/users/:id', requireManager, async (c) => {
  const target = get('SELECT * FROM users WHERE id = ?', c.req.param('id'));
  if (!target) return c.json({ error: 'Person not found.' }, 404);
  const body = z.object({ role: z.enum(['manager', 'handler']).optional(), active: z.boolean().optional(), password: password.optional() }).parse(await c.req.json());
  const staysManager = (body.role ?? target.role) === 'manager' && (body.active ?? Boolean(target.active));
  if (target.role === 'manager' && target.active && !staysManager) {
    const managers = get("SELECT COUNT(*) AS n FROM users WHERE role = 'manager' AND active = 1")!.n;
    if (managers <= 1) return c.json({ error: 'There must always be at least one manager.' }, 409);
  }
  if (body.role) run('UPDATE users SET role = ? WHERE id = ?', body.role, target.id);
  if (body.active !== undefined) run('UPDATE users SET active = ? WHERE id = ?', body.active ? 1 : 0, target.id);
  if (body.password) run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(body.password), target.id);
  if (body.password || body.active === false) endAllSessions(target.id);
  audit(c.get('user').name, 'Changed team member', null, `${target.email}: ${Object.keys(body).join(', ')}`);
  return c.json(publicUser(get('SELECT * FROM users WHERE id = ?', target.id)!));
});

staff.get('/audit', requireManager, (c) => {
  const claim = c.req.query('claim');
  const rows = claim
    ? all('SELECT * FROM audit WHERE claim_ref = ? ORDER BY id DESC LIMIT 500', claim)
    : all('SELECT * FROM audit ORDER BY id DESC LIMIT 500');
  return c.json(rows);
});

staff.get('/settings', requireManager, (c) => c.json({ retentionDays: Number(setting('retention_days', '0')) }));

staff.put('/settings', requireManager, async (c) => {
  const { retentionDays } = z.object({ retentionDays: z.number().int().min(0).max(36500) }).parse(await c.req.json());
  setSetting('retention_days', String(retentionDays));
  audit(c.get('user').name, 'Changed retention period', null, retentionDays ? `${retentionDays} days` : 'Keep until deleted');
  return c.json({ retentionDays });
});

staff.get('/settings/inbox', requireManager, (c) => c.json(inboxView()));

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
  audit(c.get('user').name, 'Connected claims inbox', null, input.user);
  return c.json(inboxView());
});

staff.post('/settings/inbox/check', requireManager, async (c) => {
  await checkInboxNow();
  audit(c.get('user').name, 'Checked claims inbox');
  return c.json(inboxView());
});

staff.delete('/settings/inbox', requireManager, (c) => {
  disconnectInbox();
  audit(c.get('user').name, 'Disconnected claims inbox');
  return c.json(inboxView());
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

app.route('/api', staff);
app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

/** Deletes files handed over longer ago than the manager's chosen period. Off until a manager sets one. */
export function applyRetention() {
  const days = Number(setting('retention_days', '0'));
  if (!days) return;
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  for (const claim of all('SELECT * FROM claims WHERE handed_over_at IS NOT NULL AND handed_over_at < ?', cutoff)) {
    all('SELECT id FROM documents WHERE claim_id = ?', claim.id).forEach(removeDocument);
    run('DELETE FROM claims WHERE id = ?', claim.id);
    audit('System', 'Deleted claim under the retention period', claim.ref, `${days} days`);
  }
}
