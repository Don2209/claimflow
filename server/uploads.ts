import type { Context } from 'hono';
import { Readable } from 'node:stream';
import type { ReadableStream as WebStream } from 'node:stream/web';
import { config } from './config.ts';

/**
 * Vercel refuses request bodies over 4.5 MB, and documents can be 25 MB. So on Vercel the browser sends each file
 * straight to the private Blob store under incoming/<scope>/, then tells the app which files it sent. The app reads
 * them back, checks them like any upload, stores an encrypted copy and deletes the original. Locally, files still
 * arrive in the request itself.
 */
export const directToStorage = () => Boolean(config.blobToken);

const INCOMING = 'incoming/';
const scopePath = (scope: string) => `${INCOMING}${scope}/`;

/** A file the request brought, or one waiting in the Blob store. Nothing is downloaded until read() is called. */
export type Incoming = { name: string; read(): Promise<Buffer>; discard(): Promise<void> };

export async function received(c: Context, scope: string): Promise<{ fields: Record<string, string>; files: Incoming[] }> {
  if ((c.req.header('content-type') ?? '').startsWith('application/json')) {
    const body = (await c.req.json().catch(() => ({}))) as { uploads?: unknown; [key: string]: unknown };
    const fields = Object.fromEntries(Object.entries(body).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    const uploads = Array.isArray(body.uploads) ? body.uploads.slice(0, 100) : [];
    const files = uploads
      .filter((item): item is { pathname: string; name: string } => typeof item?.pathname === 'string' && typeof item?.name === 'string')
      // Only files sent for this claim, so one upload link cannot pull in another's files.
      .filter((item) => item.pathname.startsWith(scopePath(scope)) && !item.pathname.includes('..'))
      .map((item) => waiting(item.pathname, item.name));
    return { fields, files };
  }
  const form = await c.req.parseBody({ all: true });
  const fields = Object.fromEntries(Object.entries(form).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
  const files = ([] as unknown[])
    .concat(form.files ?? [])
    .filter((file): file is File => file instanceof File)
    .map((file) => ({ name: file.name, read: async () => Buffer.from(await file.arrayBuffer()), discard: async () => undefined }));
  return { fields, files };
}

function waiting(pathname: string, name: string): Incoming {
  return {
    name: name.slice(0, 200),
    async read() {
      const { get, del } = await import('@vercel/blob');
      const found = await get(pathname, { access: 'private', useCache: false, token: config.blobToken });
      if (!found || found.statusCode !== 200 || !found.stream) return Buffer.alloc(0);
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of Readable.fromWeb(found.stream as WebStream<Uint8Array>) as AsyncIterable<Buffer>) {
        size += chunk.length;
        // Never hold more than the largest allowed file. The size check that follows rejects it.
        if (size > config.maxFileBytes + 1) break;
        chunks.push(chunk);
      }
      await del(pathname, { token: config.blobToken }).catch(() => undefined);
      return Buffer.concat(chunks);
    },
    async discard() {
      const { del } = await import('@vercel/blob');
      await del(pathname, { token: config.blobToken }).catch(() => undefined);
    },
  };
}

/**
 * Hands the browser a short-lived token to upload one file into this scope, after `allowed` says yes.
 * Vercel also calls this address when an upload finishes; that call is checked by its signature.
 */
export async function uploadToken(c: Context, allowed: (scope: string) => Promise<boolean>) {
  if (!directToStorage()) return c.json({ error: 'Uploads go through the app here.' }, 404);
  const { handleUpload } = await import('@vercel/blob/client');
  const body = await c.req.json();
  try {
    const result = await handleUpload({
      body,
      request: c.req.raw,
      token: config.blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const scope = String(JSON.parse(clientPayload ?? '{}').scope ?? '');
        if (!/^[a-z]+(-[A-Za-z0-9-]+)?$/.test(scope) || !pathname.startsWith(scopePath(scope)) || pathname.includes('..')) {
          throw new Error('That upload is not allowed.');
        }
        if (!(await allowed(scope))) throw new Error('That upload is not allowed.');
        return { maximumSizeInBytes: config.maxFileBytes, addRandomSuffix: true, validUntil: Date.now() + 15 * 60_000 };
      },
      // The browser reports its files itself, so nothing more is needed here.
      onUploadCompleted: async () => undefined,
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message || 'That upload is not allowed.' }, 400);
  }
}

/** Deletes files sent to the Blob store that nobody came back for, such as from an upload abandoned part-way. */
export async function sweepIncoming(olderThanMs = 3600_000) {
  if (!directToStorage()) return;
  const { list, del } = await import('@vercel/blob');
  const cutoff = Date.now() - olderThanMs;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: INCOMING, cursor, limit: 1000, token: config.blobToken });
    const old = page.blobs.filter((item) => item.uploadedAt.getTime() < cutoff).map((item) => item.url);
    if (old.length) await del(old, { token: config.blobToken });
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
