import ExcelJS from 'exceljs';
import { claimRow } from './claims.ts';
import { all, type Row } from './db.ts';
import { documentTypes } from './doctypes.ts';

const claimColumns: [string, (row: ReturnType<typeof claimRow>, claim: Row) => string | number][] = [
  ['Reference', (r) => r.ref], ['Class', (r) => r.className ?? ''], ['Stage', (r) => r.stageLabel],
  ['Claimant', (r) => r.claimantName], ['Policy number', (r) => r.policyNumber], ['Vehicle registration', (r) => r.vehicleReg],
  ['Loss date', (r) => r.lossDate], ['Broker or branch', (r) => r.source], ['Documents', (r) => r.documents],
  ['Missing', (r) => r.missing.join('; ')], ['Open flags', (r) => r.openFlags], ['Opened', (r) => r.createdAt.slice(0, 10)],
];

function claimsTable() {
  const claims = all('SELECT * FROM claims ORDER BY seq');
  return { head: claimColumns.map(([name]) => name), rows: claims.map((claim) => claimColumns.map(([, read]) => read(claimRow(claim), claim))) };
}

function fieldsTable() {
  const rows = all(
    `SELECT c.ref, d.filename, d.doc_type, d.fields_json FROM documents d JOIN claims c ON c.id = d.claim_id WHERE d.status = 'done' ORDER BY c.seq, d.created_at`,
  ).flatMap((doc) =>
    JSON.parse(doc.fields_json).map((field: Row) => [
      doc.ref, doc.filename, documentTypes[doc.doc_type] ?? doc.doc_type, field.label, field.value, field.page, field.confidence,
    ]),
  );
  return { head: ['Reference', 'File', 'Document', 'Detail', 'Value', 'Page', 'Confidence'], rows };
}

/** A spreadsheet treats a cell starting with these as a formula, and these values come from outside documents. */
const safeCell = (value: unknown) => {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

export function claimsCsv(): string {
  const { head, rows } = claimsTable();
  return [head, ...rows].map((row) => row.map((cell) => `"${safeCell(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}

export async function workbook(): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  for (const [name, table] of [['Claims', claimsTable()], ['Extracted details', fieldsTable()]] as const) {
    const sheet = book.addWorksheet(name);
    sheet.addRow(table.head).font = { bold: true };
    table.rows.forEach((row: unknown[]) => sheet.addRow(row.map((cell) => (typeof cell === 'number' ? cell : safeCell(cell)))));
    sheet.columns.forEach((column) => (column.width = 22));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

export function dashboard() {
  const claims = all('SELECT * FROM claims ORDER BY created_at').map((claim) => claimRow(claim));
  const open = claims.filter((claim) => claim.stage !== 'handed_over');
  const stages: Record<string, number> = {};
  for (const claim of open) stages[claim.stageLabel] = (stages[claim.stageLabel] ?? 0) + 1;
  const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);

  const waiting = open
    .filter((claim) => claim.stage === 'missing')
    .map((claim) => ({ id: claim.id, ref: claim.ref, claimantName: claim.claimantName, source: claim.source, missing: claim.missing, days: daysSince(claim.createdAt) }))
    .sort((a, b) => b.days - a.days);

  const bySource = new Map<string, { source: string; total: number; incomplete: number }>();
  for (const claim of claims) {
    const source = claim.source || 'Not recorded';
    const entry = bySource.get(source) ?? { source, total: 0, incomplete: 0 };
    entry.total += 1;
    if (claim.missing.length) entry.incomplete += 1;
    bySource.set(source, entry);
  }
  const doc = all("SELECT status, COUNT(*) AS n FROM documents GROUP BY status");
  return {
    openClaims: open.length,
    handedOver: claims.length - open.length,
    documentsRead: doc.find((row) => row.status === 'done')?.n ?? 0,
    openFlags: open.reduce((sum, claim) => sum + claim.openFlags, 0),
    stages,
    waiting,
    sources: [...bySource.values()].sort((a, b) => b.incomplete / b.total - a.incomplete / a.total || b.total - a.total),
  };
}
