import { readDocument, reviewClaim } from './ai.ts';
import { later } from './background.ts';
import { checklistFor, ruleFlags, saveFlags } from './claims.ts';
import { config } from './config.ts';
import { all, audit, batch, count, get, now, run, setting, type Row } from './db.ts';
import { documentTypes } from './doctypes.ts';
import { deleteFile, detectFileType, readFile, saveFile, sha256 } from './files.ts';

// One at a time on the free AI plan, which limits requests per minute. This counts across every copy of the app.
const MAX_AT_ONCE = config.freeAiPlan ? 1 : 3;
// A Vercel function stops after 300 seconds, so stop taking new documents well before then. The next run takes the rest.
const TAKE_NEW_WORK_FOR_MS = Number(process.env.PIPELINE_WINDOW_MS || 150_000);
// A read or review still marked as running after this was cut off, and is tried again.
export const STALE_AFTER_MS = 10 * 60_000;
const MAX_READ_ATTEMPTS = 3;

export class FileRejected extends Error {}

export function checkUpload(filename: string, data: Buffer): string {
  if (data.length > config.maxFileBytes) throw new FileRejected(`${filename} is larger than 25 MB.`);
  if (!data.length) throw new FileRejected(`${filename} is empty.`);
  const mime = detectFileType(data, filename);
  if (!mime) throw new FileRejected(`${filename} could not be opened. Send a photo, or a PDF, Word, Excel or text file, without a password.`);
  return mime;
}

/** Stores the file and queues it for reading. Call startReading() once the request has added everything. */
export async function addDocument(claim: Row, filename: string, data: Buffer, origin: string, actor: string): Promise<Row> {
  const mime = checkUpload(filename, data);
  const id = crypto.randomUUID();
  await saveFile(id, data);
  await batch([
    ['INSERT INTO documents (id, claim_id, filename, mime, size, sha256, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, claim.id, filename.slice(0, 200), mime, data.length, sha256(data), origin, now()],
    ['UPDATE claims SET updated_at = ? WHERE id = ?', now(), claim.id],
  ]);
  await audit(actor, `Added document (${origin})`, claim.ref, filename);
  return (await get('SELECT * FROM documents WHERE id = ?', id))!;
}

export async function removeDocument(doc: Row) {
  await deleteFile(doc.id);
  await run('DELETE FROM documents WHERE id = ?', doc.id);
}

/** Reads waiting documents after the reply has gone. */
export function startReading() {
  later(pump());
}

let pumping: Promise<void> | null = null;
let pumpAgain = false;

/**
 * Works through waiting documents. Their state is in the database, so a cut-off run is picked up later.
 * Within one copy of the app only one pump runs; asking again while it runs makes it look once more at the end.
 */
export function pump(): Promise<void> {
  if (pumping) {
    pumpAgain = true;
    return pumping;
  }
  pumping = (async () => {
    try {
      do {
        pumpAgain = false;
        await pumpOnce();
      } while (pumpAgain);
    } finally {
      pumping = null;
    }
  })();
  return pumping;
}

async function pumpOnce() {
  if (!config.aiConfigured) {
    for (const claim of await all("SELECT DISTINCT c.* FROM claims c JOIN documents d ON d.claim_id = c.id WHERE d.status = 'queued'")) {
      await refreshRuleChecks(claim.id);
    }
    return;
  }
  const stopTaking = Date.now() + TAKE_NEW_WORK_FOR_MS;
  const worker = async () => {
    while (Date.now() < stopTaking) {
      const doc = await takeNextDocument();
      if (!doc) return;
      await read(doc);
    }
  };
  await Promise.all(Array.from({ length: MAX_AT_ONCE }, worker));
}

/** Claims the oldest waiting document in one statement, so two copies of the app never read the same one. */
async function takeNextDocument(): Promise<Row | undefined> {
  return get(
    `UPDATE documents SET status = 'reading', error = '', reading_since = ?, read_attempts = read_attempts + 1
     WHERE id = (SELECT id FROM documents WHERE status = 'queued' ORDER BY created_at LIMIT 1)
       AND (SELECT COUNT(*) FROM documents WHERE status = 'reading') < ?
     RETURNING *`,
    now(), MAX_AT_ONCE,
  );
}

async function read(doc: Row) {
  const claim = await get('SELECT * FROM claims WHERE id = ?', doc.claim_id);
  if (!claim) return;
  try {
    const reading = await readDocument(await readFile(doc.id), doc.mime, doc.filename);
    const docType = documentTypes[reading.doc_type] ? reading.doc_type : 'other';
    // Someone's correction outranks the AI, including when a document is read again.
    const stillAi = !doc.type_set_by || doc.type_set_by === 'ai';
    await run(
      `UPDATE documents SET status = 'done', error = '', reading_since = NULL, doc_type = ?, type_set_by = ?, confidence = ?, language = ?, handwritten = ?, description = ?, issues_json = ?, fields_json = ?, line_items_json = ? WHERE id = ?`,
      stillAi ? docType : doc.doc_type, stillAi ? 'ai' : doc.type_set_by, reading.confidence, reading.language, reading.handwritten ? 1 : 0,
      reading.description, JSON.stringify(reading.issues), JSON.stringify(reading.fields), JSON.stringify(reading.line_items), doc.id,
    );
    await audit('ClaimsFlow AI', 'Read document', claim.ref, `${doc.filename}: ${documentTypes[docType]}`);
  } catch (error) {
    await run("UPDATE documents SET status = 'failed', error = ?, reading_since = NULL WHERE id = ?", friendly(error), doc.id);
    await audit('ClaimsFlow AI', 'Could not read document', claim.ref, `${doc.filename}: ${friendly(error)}`);
  }
  await scheduleReview(doc.claim_id);
}

function friendly(error: unknown): string {
  console.error(error);
  const status = (error as { status?: number }).status;
  if (status === 401 || status === 403) return 'The AI key was refused. A manager needs to check it.';
  if (status === 429) return 'The AI usage limit was reached. Wait a while, then press Read again.';
  if ((error as Error).name === 'AbortError' || (error as Error).name === 'TimeoutError') return 'The AI took too long to answer. Try again shortly.';
  if (status && status >= 500) return 'The AI service had a problem. Try again shortly.';
  if (status === 400) return 'The AI could not accept this file. It may be damaged or password-protected.';
  return error instanceof Error ? error.message.slice(0, 300) : 'Reading failed.';
}

export async function refreshRuleChecks(claimId: string) {
  const claim = await get('SELECT * FROM claims WHERE id = ?', claimId);
  if (claim) await saveFlags(claimId, 'rule', await ruleFlags(claim));
}

/** Reviews the whole file once nothing in it is waiting to be read. */
export async function scheduleReview(claimId: string) {
  await refreshRuleChecks(claimId);
  const waiting = await count("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status IN ('queued','reading')", claimId);
  if (waiting) return;
  await reviewFile(claimId);
}

/** After a person changes something: the rule checks are brought up to date now, and the AI review runs after the reply. */
export async function fileChanged(claimId: string) {
  await refreshRuleChecks(claimId);
  const waiting = await count("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status IN ('queued','reading')", claimId);
  if (!waiting) later(reviewFile(claimId));
}

export async function reviewFile(claimId: string) {
  if (!config.aiConfigured) return;
  const done = await all("SELECT * FROM documents WHERE claim_id = ? AND status = 'done'", claimId);
  if (!done.length) return;
  // Taken in one statement, so only one copy of the app reviews a claim at a time. A review cut off long ago does not block.
  const started = await run(
    `UPDATE claims SET analysis_status = 'running', analysis_error = '', analysis_started_at = ?, review_again = 0
     WHERE id = ? AND (analysis_status <> 'running' OR analysis_started_at IS NULL OR analysis_started_at < ?)`,
    now(), claimId, new Date(Date.now() - STALE_AFTER_MS).toISOString(),
  );
  if (!started.changes) {
    // Something changed mid-review, so go over the file once more when this one ends.
    await run('UPDATE claims SET review_again = 1 WHERE id = ?', claimId);
    return;
  }
  try {
    await refreshRuleChecks(claimId);
    let claim = (await get('SELECT * FROM claims WHERE id = ?', claimId))!;
    const classes = await all('SELECT id, name FROM classes');
    const outstanding = (await checklistFor(claim)).filter((item) => item.required && !item.documentIds.length).map((item) => item.label);
    const unreadable = done.filter((doc) => JSON.parse(doc.issues_json).length).map((doc) => ({ file: doc.filename, issues: JSON.parse(doc.issues_json) }));
    const review = await reviewClaim({
      reference: claim.ref,
      class_of_business: classes.find((c) => c.id === claim.class_id)?.name ?? null,
      classes_available: classes.map((c) => c.name),
      entered_by_handler: {
        claimant: claim.claimant_name, policy_number: claim.policy_number, vehicle_registration: claim.vehicle_reg,
        loss_date: claim.loss_date, policy_start: claim.policy_start, policy_end: claim.policy_end, notes: claim.notes,
      },
      documents: done.map((doc) => ({
        document_id: doc.id, file: doc.filename, type: documentTypes[doc.doc_type] ?? doc.doc_type, fields: JSON.parse(doc.fields_json), line_items: JSON.parse(doc.line_items_json),
      })),
      outstanding_documents: outstanding,
      documents_with_reading_problems: unreadable,
      already_flagged_do_not_repeat: await all("SELECT title, detail FROM flags WHERE claim_id = ? AND origin = 'rule'", claimId),
      already_dismissed_by_handler_do_not_raise_again: await all("SELECT title, note FROM flags WHERE claim_id = ? AND status = 'dismissed'", claimId),
    });

    const details = review.claim_details;
    const suggested = classes.find((c) => c.name === review.suggested_class)?.id ?? null;
    // Fill only what nobody has entered. Anything already there is compared instead, never overwritten.
    await run(
      `UPDATE claims SET claimant_name = COALESCE(NULLIF(claimant_name, ''), ?), policy_number = COALESCE(NULLIF(policy_number, ''), ?),
       contact_email = COALESCE(NULLIF(contact_email, ''), ?), contact_phone = COALESCE(NULLIF(contact_phone, ''), ?),
       vehicle_reg = COALESCE(NULLIF(vehicle_reg, ''), ?), loss_date = COALESCE(NULLIF(loss_date, ''), ?),
       policy_start = COALESCE(NULLIF(policy_start, ''), ?), policy_end = COALESCE(NULLIF(policy_end, ''), ?), class_id = COALESCE(class_id, ?) WHERE id = ?`,
      details.claimant_name, details.policy_number, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.contact_email) ? details.contact_email : '', details.contact_phone, details.vehicle_registration, details.loss_date, details.policy_start, details.policy_end, suggested, claimId,
    );
    claim = (await get('SELECT * FROM claims WHERE id = ?', claimId))!;
    const validIds = new Set(done.map((doc) => doc.id as string));
    await saveFlags(claimId, 'ai', review.flags.map((flag) => ({
      key: `ai:${flag.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120)}`,
      severity: flag.severity, title: flag.title, detail: flag.detail, documentIds: flag.document_ids.filter((id) => validIds.has(id)),
    })));
    await refreshRuleChecks(claimId);

    // Never overwrite a request a handler has edited.
    if (!claim.draft_edited) {
      await run('UPDATE claims SET draft_subject = ?, draft_body = ? WHERE id = ?', review.request.subject, review.request.body, claimId);
    }
    await run("UPDATE claims SET summary_json = ?, analysis_status = 'done', analysed_at = ?, updated_at = ? WHERE id = ?", JSON.stringify({ ...review.summary, quote_rows: review.quote_rows, next_steps: review.next_steps }), now(), now(), claimId);
    await audit('ClaimsFlow AI', 'Reviewed file', claim.ref, `${review.flags.length} flags raised`);
  } catch (error) {
    await run("UPDATE claims SET analysis_status = 'failed', analysis_error = ? WHERE id = ?", friendly(error), claimId);
  }
  const again = await get('SELECT review_again FROM claims WHERE id = ?', claimId);
  if (again?.review_again) await scheduleReview(claimId);
}

/**
 * Puts back work that was cut off, for example when a function reached its time limit. A document that keeps
 * getting cut off is marked for a person instead of being tried for ever.
 */
export async function recoverStalledWork(olderThanMs = STALE_AFTER_MS) {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  await run(
    "UPDATE documents SET status = 'failed', reading_since = NULL, error = 'Reading this file kept stopping part-way. Press Read again, or check the file.' WHERE status = 'reading' AND reading_since < ? AND read_attempts >= ?",
    cutoff, MAX_READ_ATTEMPTS,
  );
  await run("UPDATE documents SET status = 'queued', reading_since = NULL WHERE status = 'reading' AND (reading_since IS NULL OR reading_since < ?)", cutoff);
  const stalled = await all("SELECT id FROM claims WHERE analysis_status = 'running' AND (analysis_started_at IS NULL OR analysis_started_at < ?)", cutoff);
  for (const claim of stalled) {
    await run("UPDATE claims SET analysis_status = 'failed', analysis_error = 'The review stopped part-way. Press Review again.' WHERE id = ?", claim.id);
  }
}

/** Removes a claim with its files, flags and documents. Child rows are deleted here rather than left to the database. */
export async function deleteClaim(claim: Row) {
  for (const doc of await all('SELECT id FROM documents WHERE claim_id = ?', claim.id)) await removeDocument(doc);
  await batch([
    ['DELETE FROM flags WHERE claim_id = ?', claim.id],
    ['DELETE FROM documents WHERE claim_id = ?', claim.id],
    ['DELETE FROM claims WHERE id = ?', claim.id],
  ]);
}

/** Deletes files handed over longer ago than the manager's chosen period. Off until a manager sets one. */
export async function applyRetention() {
  const days = Number(await setting('retention_days', '0'));
  if (!days) return;
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  for (const claim of await all('SELECT * FROM claims WHERE handed_over_at IS NOT NULL AND handed_over_at < ?', cutoff)) {
    await deleteClaim(claim);
    await audit('System', 'Deleted claim under the retention period', claim.ref, `${days} days`);
  }
}
