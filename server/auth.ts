import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { all, audit, count, get, now, run, type Row } from './db.ts';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;
const SESSION_DAYS = 7;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${(await scryptAsync(password, salt, 64)).toString('hex')}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

export async function startSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', hashToken(token), userId, expires);
  await run('DELETE FROM sessions WHERE expires_at < ?', now());
  return token;
}

export const endSession = (token: string) => run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
export const endAllSessions = (userId: string) => run('DELETE FROM sessions WHERE user_id = ?', userId);

export async function userForSession(token: string | undefined): Promise<Row | undefined> {
  if (!token) return undefined;
  return get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
    hashToken(token), now(),
  );
}

// Kept in the database, because each request can reach a different copy of the app.
const WINDOW = 15 * 60 * 1000;
const since = (ms: number) => new Date(Date.now() - ms).toISOString();
export const recentAttempts = (key: string, withinMs: number) => count('SELECT COUNT(*) AS n FROM attempts WHERE key = ? AND at > ?', key, since(withinMs));
export const noteAttempt = (key: string) => run('INSERT INTO attempts (key, at) VALUES (?, ?)', key, now());
export const forgetOldAttempts = () => run('DELETE FROM attempts WHERE at < ?', since(864e5));

export const isLockedOut = async (key: string) => (await recentAttempts(`login:${key}`, WINDOW)) >= 8;
export const noteFailure = (key: string) => noteAttempt(`login:${key}`);
export const clearFailures = (key: string) => run('DELETE FROM attempts WHERE key = ?', `login:${key}`);

export async function createUser(email: string, name: string, role: string, password: string): Promise<Row> {
  const id = crypto.randomUUID();
  await run(
    'INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id, email.toLowerCase().trim(), name.trim(), role, await hashPassword(password), now(),
  );
  return (await get('SELECT * FROM users WHERE id = ?', id))!;
}

/** The first manager comes from ADMIN_EMAIL and ADMIN_PASSWORD. Runs once per copy of the app, and creates the account only once. */
let firstManager: Promise<void> | null = null;
export function ensureFirstManager(): Promise<void> {
  firstManager ??= createFirstManager().catch((error) => {
    firstManager = null;
    throw error;
  });
  return firstManager;
}

async function createFirstManager() {
  if ((await all('SELECT id FROM users LIMIT 1')).length) return;
  // Two copies starting together must not both create one.
  const claimed = await run("INSERT INTO settings (key, value) VALUES ('first_manager', ?) ON CONFLICT(key) DO NOTHING", now());
  if (!claimed.changes) return;
  const email = process.env.ADMIN_EMAIL || 'admin@claimsflow.local';
  const generated = randomBytes(12).toString('base64url');
  const password = process.env.ADMIN_PASSWORD || generated;
  try {
    await createUser(email, 'Manager', 'manager', password);
  } catch (error) {
    await run("DELETE FROM settings WHERE key = 'first_manager'");
    throw error;
  }
  await audit('System', 'Created first manager', null, email);
  console.log(`First manager: ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Temporary password: ${generated}`);
}
