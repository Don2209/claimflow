import { readDocument, reviewClaim } from './ai.ts';
import { checklistFor, ruleFlags, saveFlags } from './claims.ts';
import { config } from './config.ts';
import { all, audit, get, now, run, type Row } from './db.ts';
import { documentTypes } from './doctypes.ts';
import { deleteFile, detectFileType, readFile, saveFile, sha256 } from './files.ts';

// One at a time on the free AI plan, which limits requests per minute.
const MAX_AT_ONCE = config.freeAiPlan ? 1 : 3;
let running = 0;
const reviewing = new Set<string>();
const reviewAgain = new Set<string>();

export class FileRejected extends Error {}

export function addDocument(claim: Row, filename: string, data: Buffer, origin: string, actor: string): Row {
  if (data.length > config.maxFileBytes) throw new FileRejected(`${filename} is larger than 25 MB.`);
  if (!data.length) throw new FileRejected(`${filename} is empty.`);
  const mime = detectFileType(data);
  if (!mime) throw new FileRejected(`${filename} is not a PDF, JPEG, PNG or WebP file. iPhone HEIC photos need saving as JPEG first.`);
  const id = crypto.randomUUID();
  saveFile(id, data);
  run(
    'INSERT INTO documents (id, claim_id, filename, mime, size, sha256, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, claim.id, filename.slice(0, 200), mime, data.length, sha256(data), origin, now(),
  );
  run('UPDATE claims SET updated_at = ? WHERE id = ?', now(), claim.id);
  audit(actor, `Added document (${origin})`, claim.ref, filename);
  setImmediate(pump);
  return get('SELECT * FROM documents WHERE id = ?', id)!;
}

export function removeDocument(doc: Row) {
  deleteFile(doc.id);
  run('DELETE FROM documents WHERE id = ?', doc.id);
}

/** Works through waiting documents. Their state is in the database, so a restart picks up where it stopped. */
export function pump() {
  if (!config.aiConfigured) {
    for (const claim of all("SELECT DISTINCT c.* FROM claims c JOIN documents d ON d.claim_id = c.id WHERE d.status = 'queued'")) {
      refreshRuleChecks(claim.id);
    }
    return;
  }
  while (running < MAX_AT_ONCE) {
    const doc = get("SELECT * FROM documents WHERE status = 'queued' ORDER BY created_at LIMIT 1");
    if (!doc) return;
    running += 1;
    run("UPDATE documents SET status = 'reading', error = '' WHERE id = ?", doc.id);
    void read(doc).finally(() => {
      running -= 1;
      pump();
    });
  }
}

async function read(doc: Row) {
  const claim = get('SELECT * FROM claims WHERE id = ?', doc.claim_id);
  if (!claim) return;
  try {
    const reading = await readDocument(readFile(doc.id), doc.mime, doc.filename);
    const docType = documentTypes[reading.doc_type] ? reading.doc_type : 'other';
    // Someone's correction outranks the AI, including when a document is read again.
    const stillAi = !doc.type_set_by || doc.type_set_by === 'ai';
    run(
      `UPDATE documents SET status = 'done', error = '', doc_type = ?, type_set_by = ?, confidence = ?, language = ?, handwritten = ?, description = ?, issues_json = ?, fields_json = ? WHERE id = ?`,
      stillAi ? docType : doc.doc_type, stillAi ? 'ai' : doc.type_set_by, reading.confidence, reading.language, reading.handwritten ? 1 : 0,
      reading.description, JSON.stringify(reading.issues), JSON.stringify(reading.fields), doc.id,
    );
    audit('ClaimsFlow AI', 'Read document', claim.ref, `${doc.filename}: ${documentTypes[docType]}`);
  } catch (error) {
    run("UPDATE documents SET status = 'failed', error = ? WHERE id = ?", friendly(error), doc.id);
    audit('ClaimsFlow AI', 'Could not read document', claim.ref, `${doc.filename}: ${friendly(error)}`);
  }
  scheduleReview(doc.claim_id);
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

export function refreshRuleChecks(claimId: string) {
  const claim = get('SELECT * FROM claims WHERE id = ?', claimId);
  if (claim) saveFlags(claimId, 'rule', ruleFlags(claim));
}

export function scheduleReview(claimId: string) {
  refreshRuleChecks(claimId);
  const waiting = get("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status IN ('queued','reading')", claimId)!.n;
  if (waiting) return;
  void reviewFile(claimId);
}

export async function reviewFile(claimId: string) {
  if (!config.aiConfigured) return;
  if (reviewing.has(claimId)) {
    // Something changed mid-review, so go over the file once more when this one ends.
    reviewAgain.add(claimId);
    return;
  }
  const done = all("SELECT * FROM documents WHERE claim_id = ? AND status = 'done'", claimId);
  if (!done.length) return;
  reviewing.add(claimId);
  run("UPDATE claims SET analysis_status = 'running', analysis_error = '' WHERE id = ?", claimId);
  try {
    refreshRuleChecks(claimId);
    let claim = get('SELECT * FROM claims WHERE id = ?', claimId)!;
    const classes = all('SELECT id, name FROM classes');
    const outstanding = checklistFor(claim).filter((item) => item.required && !item.documentIds.length).map((item) => item.label);
    const unreadable = done.filter((doc) => JSON.parse(doc.issues_json).length).map((doc) => ({ file: doc.filename, issues: JSON.parse(doc.issues_json) }));
    const review = await reviewClaim({
      reference: claim.ref,
      class_of_business: classes.find((c) => c.id === claim.class_id)?.name ?? null,
      classes_available: classes.map((c) => c.name),
      entered_by_handler: {
        claimant: claim.claimant_name, policy_number: claim.policy_number, vehicle_registration: claim.vehicle_reg,
        loss_date: claim.loss_date, policy_start: claim.policy_start, policy_end: claim.policy_end,
      },
      documents: done.map((doc) => ({
        document_id: doc.id, file: doc.filename, type: documentTypes[doc.doc_type] ?? doc.doc_type, fields: JSON.parse(doc.fields_json),
      })),
      outstanding_documents: outstanding,
      documents_with_reading_problems: unreadable,
      already_flagged_do_not_repeat: all("SELECT title, detail FROM flags WHERE claim_id = ? AND origin = 'rule'", claimId),
      already_dismissed_by_handler_do_not_raise_again: all("SELECT title, note FROM flags WHERE claim_id = ? AND status = 'dismissed'", claimId),
    });

    const details = review.claim_details;
    const suggested = classes.find((c) => c.name === review.suggested_class)?.id ?? null;
    // Fill only what nobody has entered. Anything already there is compared instead, never overwritten.
    run(
      `UPDATE claims SET claimant_name = COALESCE(NULLIF(claimant_name, ''), ?), policy_number = COALESCE(NULLIF(policy_number, ''), ?),
       vehicle_reg = COALESCE(NULLIF(vehicle_reg, ''), ?), loss_date = COALESCE(NULLIF(loss_date, ''), ?),
       policy_start = COALESCE(NULLIF(policy_start, ''), ?), policy_end = COALESCE(NULLIF(policy_end, ''), ?), class_id = COALESCE(class_id, ?) WHERE id = ?`,
      details.claimant_name, details.policy_number, details.vehicle_registration, details.loss_date, details.policy_start, details.policy_end, suggested, claimId,
    );
    claim = get('SELECT * FROM claims WHERE id = ?', claimId)!;
    const validIds = new Set(done.map((doc) => doc.id as string));
    saveFlags(claimId, 'ai', review.flags.map((flag) => ({
      key: `ai:${flag.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120)}`,
      severity: flag.severity, title: flag.title, detail: flag.detail, documentIds: flag.document_ids.filter((id) => validIds.has(id)),
    })));
    refreshRuleChecks(claimId);

    // Never overwrite a request a handler has edited.
    if (!claim.draft_edited) {
      run('UPDATE claims SET draft_subject = ?, draft_body = ? WHERE id = ?', review.request.subject, review.request.body, claimId);
    }
    run("UPDATE claims SET summary_json = ?, analysis_status = 'done', analysed_at = ?, updated_at = ? WHERE id = ?", JSON.stringify(review.summary), now(), now(), claimId);
    audit('ClaimsFlow AI', 'Reviewed file', claim.ref, `${review.flags.length} flags raised`);
  } catch (error) {
    run("UPDATE claims SET analysis_status = 'failed', analysis_error = ? WHERE id = ?", friendly(error), claimId);
  } finally {
    reviewing.delete(claimId);
    if (reviewAgain.delete(claimId)) scheduleReview(claimId);
  }
}

/** After a restart, anything caught mid-read goes back in the queue. */
export function resumeAfterRestart() {
  run("UPDATE documents SET status = 'queued' WHERE status = 'reading'");
  run("UPDATE claims SET analysis_status = 'idle' WHERE analysis_status = 'running'");
  pump();
}
