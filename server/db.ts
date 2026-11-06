import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { config } from './config.ts';
import { startingChecklists } from './doctypes.ts';

export const db = new DatabaseSync(join(config.dataDir, 'claimsflow.db'));
db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager','handler')),
  password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS checklist_items (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, required INTEGER NOT NULL, position INTEGER NOT NULL,
  PRIMARY KEY (class_id, doc_type)
);
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY, seq INTEGER NOT NULL, ref TEXT UNIQUE NOT NULL,
  class_id TEXT REFERENCES classes(id),
  claimant_name TEXT NOT NULL DEFAULT '', contact_email TEXT NOT NULL DEFAULT '', contact_phone TEXT NOT NULL DEFAULT '',
  policy_number TEXT NOT NULL DEFAULT '', vehicle_reg TEXT NOT NULL DEFAULT '',
  policy_start TEXT NOT NULL DEFAULT '', policy_end TEXT NOT NULL DEFAULT '', loss_date TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  portal_token TEXT UNIQUE NOT NULL,
  summary_json TEXT, draft_subject TEXT NOT NULL DEFAULT '', draft_body TEXT NOT NULL DEFAULT '',
  draft_edited INTEGER NOT NULL DEFAULT 0, draft_sent_at TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'idle', analysis_error TEXT NOT NULL DEFAULT '', analysed_at TEXT,
  handed_over_at TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', error TEXT NOT NULL DEFAULT '',
  doc_type TEXT, type_set_by TEXT, confidence TEXT, language TEXT NOT NULL DEFAULT '',
  handwritten INTEGER NOT NULL DEFAULT 0, description TEXT NOT NULL DEFAULT '', issues_json TEXT NOT NULL DEFAULT '[]',
  fields_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_claim ON documents(claim_id);
CREATE TABLE IF NOT EXISTS flags (
  id TEXT PRIMARY KEY, claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  key TEXT NOT NULL, origin TEXT NOT NULL, severity TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
  document_ids TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'open', note TEXT NOT NULL DEFAULT '',
  resolved_by TEXT, created_at TEXT NOT NULL, UNIQUE (claim_id, key)
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL,
  claim_ref TEXT, detail TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS emails_seen (message_id TEXT PRIMARY KEY, claim_ref TEXT, at TEXT NOT NULL);
`);

// Databases created before these columns existed.
const hasColumn = (table: string, name: string) => db.prepare(`PRAGMA table_info(${table})`).all().some((column) => column.name === name);
if (!hasColumn('claims', 'contact_phone')) db.exec("ALTER TABLE claims ADD COLUMN contact_phone TEXT NOT NULL DEFAULT ''");
if (!hasColumn('documents', 'line_items_json')) db.exec("ALTER TABLE documents ADD COLUMN line_items_json TEXT NOT NULL DEFAULT '[]'");

export type Row = Record<string, any>;
export const all = (sql: string, ...args: any[]): Row[] => db.prepare(sql).all(...args) as Row[];
export const get = (sql: string, ...args: any[]): Row | undefined => db.prepare(sql).get(...args) as Row | undefined;
export const run = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);
export const now = () => new Date().toISOString();

export function setting(key: string, fallback = ''): string {
  return get('SELECT value FROM settings WHERE key = ?', key)?.value ?? fallback;
}
export function setSetting(key: string, value: string) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

export function audit(actor: string, action: string, claimRef: string | null = null, detail = '') {
  run('INSERT INTO audit (at, actor, action, claim_ref, detail) VALUES (?, ?, ?, ?, ?)', now(), actor, action, claimRef, detail);
}

if (!get('SELECT 1 AS x FROM classes LIMIT 1')) {
  for (const [name, items] of Object.entries(startingChecklists)) {
    const id = crypto.randomUUID();
    run('INSERT INTO classes (id, name) VALUES (?, ?)', id, name);
    items.forEach((item, position) =>
      run('INSERT INTO checklist_items (class_id, doc_type, required, position) VALUES (?, ?, ?, ?)', id, item.type, item.required ? 1 : 0, position),
    );
  }
}
