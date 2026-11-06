import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { all, audit, get, now, run, type Row } from './db.ts';

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

export function startSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', hashToken(token), userId, expires);
  run('DELETE FROM sessions WHERE expires_at < ?', now());
  return token;
}

export const endSession = (token: string) => run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
export const endAllSessions = (userId: string) => run('DELETE FROM sessions WHERE user_id = ?', userId);

export function userForSession(token: string | undefined): Row | undefined {
  if (!token) return undefined;
  return get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
    hashToken(token), now(),
  );
}

const failures = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;
export const isLockedOut = (key: string) => {
  const entry = failures.get(key);
  return Boolean(entry && entry.until > Date.now() && entry.count >= 8);
};
export const noteFailure = (key: string) => {
  const entry = failures.get(key);
  const fresh = !entry || entry.until < Date.now();
  failures.set(key, { count: fresh ? 1 : entry.count + 1, until: Date.now() + WINDOW });
};
export const clearFailures = (key: string) => failures.delete(key);

export async function createUser(email: string, name: string, role: string, password: string): Promise<Row> {
  const id = crypto.randomUUID();
  run(
    'INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id, email.toLowerCase().trim(), name.trim(), role, await hashPassword(password), now(),
  );
  return get('SELECT * FROM users WHERE id = ?', id)!;
}

/** The first manager comes from ADMIN_EMAIL and ADMIN_PASSWORD. */
export async function ensureFirstManager() {
  if (all('SELECT id FROM users LIMIT 1').length) return;
  const email = process.env.ADMIN_EMAIL || 'admin@claimsflow.local';
  const generated = randomBytes(12).toString('base64url');
  const password = process.env.ADMIN_PASSWORD || generated;
  await createUser(email, 'Manager', 'manager', password);
  audit('System', 'Created first manager', null, email);
  console.log(`First manager: ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Temporary password: ${generated}`);
}
