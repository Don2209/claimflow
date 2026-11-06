import { all, audit, get, now, run, type Row } from './db.ts';
import { documentTypes } from './doctypes.ts';
import { config } from './config.ts';
import { addUp, buildInsights } from './insights.ts';

export function checklistFor(claim: Row) {
  const items = claim.class_id ? all('SELECT doc_type, required FROM checklist_items WHERE class_id = ? ORDER BY position', claim.class_id) : [];
  const docs = all("SELECT id, doc_type FROM documents WHERE claim_id = ? AND status = 'done'", claim.id);
  return items.map((item) => ({
    type: item.doc_type as string,
    label: documentTypes[item.doc_type] ?? item.doc_type,
    required: Boolean(item.required),
    documentIds: docs.filter((doc) => doc.doc_type === item.doc_type).map((doc) => doc.id as string),
  }));
}

/** Where the file stands, worked out from its contents so it can never be out of date. */
export function stageOf(claim: Row): string {
  if (claim.handed_over_at) return 'handed_over';
  const pending = get("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status IN ('queued','reading')", claim.id)!.n;
  if (pending || claim.analysis_status === 'running') return 'reading';
  const count = get('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', claim.id)!.n;
  if (!count) return 'new';
  const failed = get("SELECT COUNT(*) AS n FROM documents WHERE claim_id = ? AND status = 'failed'", claim.id)!.n;
  if (failed) return 'needs_person';
  if (checklistFor(claim).some((item) => item.required && !item.documentIds.length)) return 'missing';
  const flags = get("SELECT COUNT(*) AS n FROM flags WHERE claim_id = ? AND status = 'open' AND severity = 'attention'", claim.id)!.n;
  return flags ? 'flagged' : 'ready';
}

export const stageLabels: Record<string, string> = {
  new: 'No documents yet',
  reading: 'Being read',
  needs_person: 'Needs a person',
  missing: 'Waiting on documents',
  flagged: 'Flagged',
  ready: 'Ready for review',
  handed_over: 'Handed over',
};

export function createClaim(input: Partial<Record<string, string | null>>, actor: string): Row {
  const seq = (get('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM claims')!.n as number);
  const ref = `CF-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
  const id = crypto.randomUUID();
  const stamp = now();
  run(
    `INSERT INTO claims (id, seq, ref, class_id, claimant_name, contact_email, contact_phone, policy_number, vehicle_reg, policy_start, policy_end, loss_date, source, notes, portal_token, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, seq, ref, input.class_id || null, input.claimant_name || '', input.contact_email || '', input.contact_phone || '', input.policy_number || '',
    input.vehicle_reg || '', input.policy_start || '', input.policy_end || '', input.loss_date || '', input.source || '', input.notes || '',
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''), actor, stamp, stamp,
  );
  audit(actor, 'Opened claim', ref);
  return get('SELECT * FROM claims WHERE id = ?', id)!;
}

const normal = (value: unknown) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const digitsAndLetters = normal;

type NewFlag = { key: string; severity: string; title: string; detail: string; documentIds: string[] };

function fieldsByKey(claimId: string) {
  const out = new Map<string, { value: string; documentId: string; label: string }[]>();
  for (const doc of all("SELECT id, fields_json FROM documents WHERE claim_id = ? AND status = 'done'", claimId)) {
    for (const field of JSON.parse(doc.fields_json)) {
      if (!field.value) continue;
      const list = out.get(field.key) ?? [];
      list.push({ value: field.value, documentId: doc.id, label: field.label });
      out.set(field.key, list);
    }
  }
  return out;
}

/** Checks that need no AI, so they hold even when the AI is unavailable. */
export function ruleFlags(claim: Row): NewFlag[] {
  const flags: NewFlag[] = [];
  const fields = fieldsByKey(claim.id);

  const comparable: [string, string, string][] = [
    ['vehicle_registration', 'Vehicle registration', claim.vehicle_reg],
    ['id_number', 'ID number', ''],
    ['policy_number', 'Policy number', claim.policy_number],
  ];
  for (const [key, label, onClaim] of comparable) {
    const found = fields.get(key) ?? [];
    const values = new Map(found.map((field) => [normal(field.value), field.value]));
    if (onClaim) values.set(normal(onClaim), onClaim);
    values.delete('');
    if (values.size > 1) {
      flags.push({
        key: `rule:differs:${key}:${[...values.keys()].sort().join('|')}`,
        severity: 'attention',
        title: `${label} differs across this file`,
        detail: `Found: ${[...values.values()].join(', ')}.`,
        documentIds: [...new Set(found.map((field) => field.documentId))],
      });
    }
  }

  const loss = claim.loss_date || fields.get('loss_date')?.[0]?.value || '';
  const start = claim.policy_start || fields.get('policy_start')?.[0]?.value || '';
  const end = claim.policy_end || fields.get('policy_end')?.[0]?.value || '';
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(loss) && ((iso.test(start) && loss < start) || (iso.test(end) && loss > end))) {
    flags.push({
      key: `rule:period:${loss}:${start}:${end}`,
      severity: 'attention',
      title: 'Loss date is outside the policy period',
      detail: `Loss date ${loss}. Policy period ${start || 'unknown'} to ${end || 'unknown'}.`,
      documentIds: [],
    });
  }

  for (const doc of all('SELECT id, filename, sha256 FROM documents WHERE claim_id = ?', claim.id)) {
    const other = get(
      `SELECT c.ref FROM documents d JOIN claims c ON c.id = d.claim_id WHERE d.sha256 = ? AND d.claim_id <> ? LIMIT 1`,
      doc.sha256, claim.id,
    );
    if (other) {
      flags.push({
        key: `rule:same-file:${doc.sha256}:${other.ref}`,
        severity: 'attention',
        title: `The same file is on claim ${other.ref}`,
        detail: `${doc.filename} is an identical copy of a document on ${other.ref}.`,
        documentIds: [doc.id],
      });
    }
  }

  for (const doc of all("SELECT id, filename, fields_json, line_items_json FROM documents WHERE claim_id = ? AND status = 'done' AND doc_type IN ('repair_quote','invoice','receipt')", claim.id)) {
    const total = JSON.parse(doc.fields_json).find((field: Row) => field.key === 'amount_total' && field.value)?.value ?? '';
    const check = addUp(JSON.parse(doc.line_items_json), total);
    if (check && !check.matches) {
      flags.push({
        key: `rule:adds-up:${doc.id}:${check.sum.value}:${check.total.value}`,
        severity: 'attention',
        title: `The figures on ${doc.filename} do not add up`,
        detail: `Its items add up to ${check.sum.currency} ${check.sum.value.toFixed(2)}, but its total says ${check.total.currency} ${check.total.value.toFixed(2)}.`,
        documentIds: [doc.id],
      });
    }
  }

  for (const key of ['quote_number', 'invoice_number']) {
    for (const field of fields.get(key) ?? []) {
      const value = digitsAndLetters(field.value);
      if (!value) continue;
      const matches = all(
        `SELECT DISTINCT c.ref, d.fields_json FROM documents d JOIN claims c ON c.id = d.claim_id WHERE d.claim_id <> ? AND d.status = 'done'`,
        claim.id,
      ).filter((row) => JSON.parse(row.fields_json).some((other: Row) => other.key === key && digitsAndLetters(other.value) === value));
      for (const ref of new Set(matches.map((row) => row.ref as string))) {
        flags.push({
          key: `rule:repeat:${key}:${value}:${ref}`,
          severity: 'attention',
          title: `${field.label} ${field.value} also appears on claim ${ref}`,
          detail: 'The same reference is on another claim. Check whether it is the same quote or invoice.',
          documentIds: [field.documentId],
        });
      }
    }
  }
  return flags;
}

export function saveFlags(claimId: string, origin: string, flags: NewFlag[]) {
  // A dismissed flag stays dismissed, and a flag whose cause has gone away is removed.
  const keys = flags.map((flag) => flag.key);
  for (const old of all("SELECT id, key FROM flags WHERE claim_id = ? AND origin = ? AND status = 'open'", claimId, origin)) {
    if (!keys.includes(old.key)) run('DELETE FROM flags WHERE id = ?', old.id);
  }
  for (const flag of flags) {
    run(
      `INSERT INTO flags (id, claim_id, key, origin, severity, title, detail, document_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(claim_id, key) DO UPDATE SET title = excluded.title, detail = excluded.detail, document_ids = excluded.document_ids`,
      crypto.randomUUID(), claimId, flag.key, origin, flag.severity, flag.title, flag.detail, JSON.stringify(flag.documentIds), now(),
    );
  }
}

export const portalLink = (claim: Row) => `${config.publicUrl}/upload/${claim.portal_token}`;

export function claimDetail(claim: Row) {
  const documents = all('SELECT * FROM documents WHERE claim_id = ? ORDER BY created_at', claim.id).map((doc) => ({
    id: doc.id, filename: doc.filename, mime: doc.mime, size: doc.size, origin: doc.origin, status: doc.status, error: doc.error,
    docType: doc.doc_type, typeLabel: doc.doc_type ? documentTypes[doc.doc_type] ?? doc.doc_type : null, typeSetBy: doc.type_set_by,
    confidence: doc.confidence, language: doc.language, handwritten: Boolean(doc.handwritten), description: doc.description,
    issues: JSON.parse(doc.issues_json), fields: JSON.parse(doc.fields_json), lineItems: JSON.parse(doc.line_items_json), createdAt: doc.created_at,
  }));
  const summary = claim.summary_json ? JSON.parse(claim.summary_json) : null;
  const flags = all('SELECT * FROM flags WHERE claim_id = ? ORDER BY status, severity, created_at', claim.id).map((flag) => ({
    id: flag.id, origin: flag.origin, severity: flag.severity, title: flag.title, detail: flag.detail,
    documentIds: JSON.parse(flag.document_ids), status: flag.status, note: flag.note, resolvedBy: flag.resolved_by,
  }));
  const className = claim.class_id ? get('SELECT name FROM classes WHERE id = ?', claim.class_id)?.name : null;
  return {
    id: claim.id, ref: claim.ref, classId: claim.class_id, className, claimantName: claim.claimant_name, contactEmail: claim.contact_email, contactPhone: claim.contact_phone,
    policyNumber: claim.policy_number, vehicleReg: claim.vehicle_reg, policyStart: claim.policy_start, policyEnd: claim.policy_end,
    lossDate: claim.loss_date, source: claim.source, notes: claim.notes, stage: stageOf(claim), stageLabel: stageLabels[stageOf(claim)],
    portalLink: portalLink(claim), summary,
    insights: buildInsights(
      { vehicleReg: claim.vehicle_reg, lossDate: claim.loss_date, policyStart: claim.policy_start, policyEnd: claim.policy_end, createdAt: claim.created_at },
      documents.map((doc) => ({ ...doc, docType: doc.docType ?? null })),
      summary,
    ),
    draft: { subject: claim.draft_subject, body: claim.draft_body, sentAt: claim.draft_sent_at },
    analysisStatus: claim.analysis_status, analysisError: claim.analysis_error, analysedAt: claim.analysed_at,
    handedOverAt: claim.handed_over_at, createdBy: claim.created_by, createdAt: claim.created_at, updatedAt: claim.updated_at,
    checklist: checklistFor(claim), documents, flags,
  };
}

export function claimRow(claim: Row) {
  const list = checklistFor(claim);
  const stage = stageOf(claim);
  return {
    id: claim.id, ref: claim.ref, claimantName: claim.claimant_name, policyNumber: claim.policy_number, vehicleReg: claim.vehicle_reg,
    source: claim.source, className: claim.class_id ? get('SELECT name FROM classes WHERE id = ?', claim.class_id)?.name : null,
    stage, stageLabel: stageLabels[stage], createdAt: claim.created_at, updatedAt: claim.updated_at, lossDate: claim.loss_date,
    documents: get('SELECT COUNT(*) AS n FROM documents WHERE claim_id = ?', claim.id)!.n,
    missing: list.filter((item) => item.required && !item.documentIds.length).map((item) => item.label),
    openFlags: get("SELECT COUNT(*) AS n FROM flags WHERE claim_id = ? AND status = 'open'", claim.id)!.n,
  };
}
