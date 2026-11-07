import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Client, InStatement, InValue } from '@libsql/client';
import { config } from './config.ts';
import { startingChecklists } from './doctypes.ts';

/**
 * Turso (libSQL) when TURSO_DATABASE_URL is set, as on Vercel. Otherwise a SQLite file under DATA_DIR, for running locally and for tests.
 * Both speak the same SQL. Several copies of the app can run at once on Vercel, so anything that must happen once is claimed with a single statement.
 */
const SCHEMA = `
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
CREATE INDEX IF NOT EXISTS documents_status ON documents(status);
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
CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, until TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (key TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS attempts_key ON attempts(key, at);
`;

// Columns added after the first release, for databases created before them.
const ADDED_COLUMNS: [string, string, string][] = [
  ['claims', 'contact_phone', "TEXT NOT NULL DEFAULT ''"],
  ['documents', 'line_items_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['documents', 'reading_since', 'TEXT'],
  ['documents', 'read_attempts', 'INTEGER NOT NULL DEFAULT 0'],
  ['claims', 'analysis_started_at', 'TEXT'],
  ['claims', 'review_again', 'INTEGER NOT NULL DEFAULT 0'],
];

let client: Client | null = null;
let ready: Promise<Client> | null = null;

async function open(): Promise<Client> {
  if (config.databaseUrl) {
    const { createClient } = await import('@libsql/client/web');
    client = createClient({ url: config.databaseUrl, authToken: config.databaseToken });
  } else {
    mkdirSync(config.dataDir, { recursive: true });
    const { createClient } = await import('@libsql/client');
    client = createClient({ url: `file:${join(config.dataDir, 'claimsflow.db')}` });
    await client.executeMultiple('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  }
  await client.executeMultiple(SCHEMA);
  for (const [table, name, type] of ADDED_COLUMNS) {
    const columns = (await client.execute(`PRAGMA table_info(${table})`)).rows;
    if (!columns.some((column) => column.name === name)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
  // The starting checklists go in once, even when two copies of the app start together.
  const seeded = await client.execute("INSERT INTO settings (key, value) VALUES ('seeded', '1') ON CONFLICT(key) DO NOTHING");
  if (seeded.rowsAffected && !(await client.execute('SELECT 1 FROM classes LIMIT 1')).rows.length) {
    const statements: InStatement[] = [];
    for (const [name, items] of Object.entries(startingChecklists)) {
      const id = crypto.randomUUID();
      statements.push({ sql: 'INSERT INTO classes (id, name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING', args: [id, name] });
      items.forEach((item, position) =>
        statements.push({
          sql: 'INSERT INTO checklist_items (class_id, doc_type, required, position) SELECT id, ?, ?, ? FROM classes WHERE name = ? ON CONFLICT DO NOTHING',
          args: [item.type, item.required ? 1 : 0, position, name],
        }),
      );
    }
    await client.batch(statements, 'write');
  }
  return client;
}

/** Opens the database on first use in each copy of the app, and sets it up. */
export function database(): Promise<Client> {
  ready ??= open().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export type Row = Record<string, any>;
const values = (args: unknown[]) => args.map((value) => (value === undefined ? null : value)) as InValue[];
// Plain objects, so rows can be spread and serialised like before.
const plain = (result: { columns: string[]; rows: ArrayLike<unknown>[] }): Row[] =>
  result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));

export async function all(sql: string, ...args: unknown[]): Promise<Row[]> {
  return plain(await (await database()).execute({ sql, args: values(args) }));
}
export async function get(sql: string, ...args: unknown[]): Promise<Row | undefined> {
  return (await all(sql, ...args))[0];
}
export async function run(sql: string, ...args: unknown[]): Promise<{ changes: number }> {
  const result = await (await database()).execute({ sql, args: values(args) });
  return { changes: result.rowsAffected };
}
/** Several writes that succeed or fail together. */
export async function batch(statements: [string, ...unknown[]][]) {
  await (await database()).batch(statements.map(([sql, ...args]) => ({ sql, args: values(args) })), 'write');
}
export const count = async (sql: string, ...args: unknown[]) => Number((await get(sql, ...args))?.n ?? 0);
export const now = () => new Date().toISOString();

export async function setting(key: string, fallback = ''): Promise<string> {
  return ((await get('SELECT value FROM settings WHERE key = ?', key))?.value as string | undefined) ?? fallback;
}
export async function setSetting(key: string, value: string) {
  await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

export async function audit(actor: string, action: string, claimRef: string | null = null, detail = '') {
  await run('INSERT INTO audit (at, actor, action, claim_ref, detail) VALUES (?, ?, ?, ?, ?)', now(), actor, action, claimRef, detail);
}

/** True for whoever takes the lock first, until it is released or runs out. Works across every copy of the app. */
export async function takeLock(name: string, forMs: number): Promise<boolean> {
  const stamp = now();
  const until = new Date(Date.now() + forMs).toISOString();
  const result = await run(
    'INSERT INTO locks (name, until) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET until = excluded.until WHERE locks.until < ?',
    name, until, stamp,
  );
  return result.changes > 0;
}
export const releaseLock = (name: string) => run('DELETE FROM locks WHERE name = ?', name);
