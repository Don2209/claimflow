import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { config } from './config.ts';

const pathFor = (id: string) => join(config.dataDir, 'files', id);

/** Works from the file's actual bytes, so a renamed file cannot pass as something else. */
export function detectFileType(data: Buffer): string | null {
  if (data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

export function saveFile(id: string, data: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.key, iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  writeFileSync(pathFor(id), Buffer.concat([iv, cipher.getAuthTag(), body]), { mode: 0o600 });
}

export function readFile(id: string): Buffer {
  const stored = readFileSync(pathFor(id));
  const decipher = createDecipheriv('aes-256-gcm', config.key, stored.subarray(0, 12));
  decipher.setAuthTag(stored.subarray(12, 28));
  return Buffer.concat([decipher.update(stored.subarray(28)), decipher.final()]);
}

export function encryptText(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.key, iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

export function decryptText(stored: string): string {
  const raw = Buffer.from(stored, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', config.key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

export const deleteFile = (id: string) => rmSync(pathFor(id), { force: true });

/** Phone photos can be too large for the AI and sideways. This straightens and shrinks a copy; the original is kept as received. */
export async function imageForReading(data: Buffer): Promise<Buffer> {
  return sharp(data).rotate().resize(2200, 2200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}
