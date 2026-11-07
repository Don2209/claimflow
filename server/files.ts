import { createCipheriv, createDecipheriv, createHash, randomBytes, type DecipherGCM } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import sharp from 'sharp';
import { config } from './config.ts';

/**
 * Where encrypted documents are kept: a private Vercel Blob store when BLOB_READ_WRITE_TOKEN is set, otherwise DATA_DIR/files.
 * Each file is IV (12 bytes), then the GCM tag (16), then the encrypted bytes. Both stores hold exactly that.
 */
type Store = {
  write(name: string, data: Buffer): Promise<void>;
  read(name: string): Promise<Buffer>;
  stream(name: string): Promise<Readable>;
  remove(name: string): Promise<void>;
};

const diskPath = (name: string) => join(config.dataDir, 'files', name);
const disk: Store = {
  async write(name, data) {
    mkdirSync(join(config.dataDir, 'files'), { recursive: true });
    writeFileSync(diskPath(name), data, { mode: 0o600 });
  },
  read: async (name) => readFileSync(diskPath(name)),
  stream: async (name) => Readable.from([readFileSync(diskPath(name))]),
  remove: async (name) => rmSync(diskPath(name), { force: true }),
};

const blobPath = (name: string) => `documents/${name}`;
const blob: Store = {
  async write(name, data) {
    const { put } = await import('@vercel/blob');
    await put(blobPath(name), data, { access: 'private', contentType: 'application/octet-stream', allowOverwrite: true, token: config.blobToken });
  },
  async read(name) {
    return Buffer.concat(await (await this.stream(name)).toArray());
  },
  async stream(name) {
    const { get } = await import('@vercel/blob');
    const found = await get(blobPath(name), { access: 'private', useCache: false, token: config.blobToken });
    if (!found || found.statusCode !== 200 || !found.stream) throw new Error(`Stored file ${name} is missing.`);
    return Readable.fromWeb(found.stream as import('node:stream/web').ReadableStream);
  },
  async remove(name) {
    const { del } = await import('@vercel/blob');
    await del(blobPath(name), { token: config.blobToken });
  },
};

const store = (): Store => (config.blobToken ? blob : disk);

export const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const OLD_WORD = 'application/msword';
export const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const HEIC = 'image/heic';
export const TEXT = 'text/plain';

const MAX_UNZIPPED_BYTES = 200 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 10_000;

/** Lists a zip's contents without unpacking it, and refuses one built to expand until the server runs out of memory. */
function zipEntryNames(data: Buffer): string[] | null {
  const end = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > data.length) return null;
  const count = data.readUInt16LE(end + 10);
  let at = data.readUInt32LE(end + 16);
  if (count > MAX_ZIP_ENTRIES) return null;
  const names: string[] = [];
  let unzipped = 0;
  for (let i = 0; i < count; i += 1) {
    if (at + 46 > data.length || data.readUInt32LE(at) !== 0x02014b50) return null;
    unzipped += data.readUInt32LE(at + 24);
    if (unzipped > MAX_UNZIPPED_BYTES) return null;
    const nameLength = data.readUInt16LE(at + 28);
    names.push(data.subarray(at + 46, at + 46 + nameLength).toString('utf8'));
    at += 46 + nameLength + data.readUInt16LE(at + 30) + data.readUInt16LE(at + 32);
  }
  return names;
}

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

/** Works from the file's actual bytes, so a renamed file cannot pass as something else. Only old Word and plain text need the name as well, because their bytes alone are ambiguous. */
export function detectFileType(data: Buffer, filename = ''): string | null {
  const extension = filename.toLowerCase().split('.').pop();
  if (data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (data.subarray(4, 8).toString('latin1') === 'ftyp' && HEIC_BRANDS.has(data.subarray(8, 12).toString('latin1'))) return HEIC;
  if (data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const names = zipEntryNames(data);
    if (names?.includes('word/document.xml')) return WORD;
    if (names?.includes('xl/workbook.xml')) return EXCEL;
    return null;
  }
  if (data.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return extension === 'doc' ? OLD_WORD : null;
  if ((extension === 'txt' || extension === 'csv') && !data.includes(0)) return TEXT;
  return null;
}

export const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

export async function saveFile(id: string, data: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.key, iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  await store().write(id, Buffer.concat([iv, cipher.getAuthTag(), body]));
}

export async function readFile(id: string): Promise<Buffer> {
  const stored = await store().read(id);
  const decipher = createDecipheriv('aes-256-gcm', config.key, stored.subarray(0, 12));
  decipher.setAuthTag(stored.subarray(12, 28));
  return Buffer.concat([decipher.update(stored.subarray(28)), decipher.final()]);
}

/**
 * Decrypts as it reads, so a large document never sits whole in memory. The tag is checked at the end:
 * if the file was tampered with, the stream fails there instead of finishing.
 */
export async function streamFile(id: string): Promise<ReadableStream<Uint8Array>> {
  const source = await store().stream(id);
  let head = Buffer.alloc(0);
  let decipher: DecipherGCM | null = null;
  const decrypt = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      if (decipher) return done(null, decipher.update(chunk));
      head = Buffer.concat([head, chunk]);
      if (head.length < 28) return done();
      decipher = createDecipheriv('aes-256-gcm', config.key, head.subarray(0, 12));
      decipher.setAuthTag(head.subarray(12, 28));
      done(null, decipher.update(head.subarray(28)));
    },
    flush(done) {
      try {
        if (!decipher) throw new Error('Stored file is damaged.');
        done(null, decipher.final());
      } catch (error) {
        done(error as Error);
      }
    },
  });
  source.on('error', (error) => decrypt.destroy(error));
  return Readable.toWeb(source.pipe(decrypt)) as ReadableStream<Uint8Array>;
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

export const deleteFile = (id: string) => store().remove(id);

/** Phone photos can be too large for the AI and sideways. This straightens and shrinks a copy; the original is kept as received. */
export async function imageForReading(data: Buffer): Promise<Buffer> {
  return sharp(data).rotate().resize(2200, 2200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}
