export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Could not reach ClaimsFlow. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong. Try again.', res.status);
  return data as T;
}

/**
 * Sends files and reports progress, because phone photos on a slow connection can take a while.
 * With `directTo` (on Vercel, whose functions refuse bodies over 4.5 MB), each file goes straight to private storage
 * under that scope, and the app is then told which files arrived. Otherwise the files go in the request itself.
 */
export async function uploadFiles<T = { added: string[]; rejected: string[] }>(
  url: string, files: File[], onProgress: (share: number) => void, fields: Record<string, string> = {}, directTo?: string,
): Promise<T> {
  if (!directTo) return uploadForm<T>(url, files, onProgress, fields);
  const { upload } = await import('@vercel/blob/client');
  const total = files.reduce((sum, file) => sum + file.size, 0) || 1;
  const sent = new Map<number, number>();
  const report = () => onProgress([...sent.values()].reduce((sum, bytes) => sum + bytes, 0) / total);
  const uploads: { pathname: string; name: string }[] = [];
  try {
    // A few at a time, so one slow photo does not hold up the rest.
    const queue = files.map((file, index) => ({ file, index }));
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { file, index } = next;
        const safeName = file.name.replace(/[^\w.\- ]/g, '_').slice(-120) || 'file';
        const blob = await upload(`incoming/${directTo}/${crypto.randomUUID()}/${safeName}`, file, {
          access: 'private',
          handleUploadUrl: '/api/uploads',
          clientPayload: JSON.stringify({ scope: directTo }),
          multipart: file.size > 8 * 1024 * 1024,
          onUploadProgress: ({ loaded }) => {
            sent.set(index, loaded);
            report();
          },
        });
        sent.set(index, file.size);
        report();
        uploads.push({ pathname: blob.pathname, name: file.name });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  } catch (error) {
    const message = (error as Error).message ?? '';
    throw new ApiError(/not allowed|limit/i.test(message) ? 'The upload was refused. The upload limit may have been reached. Contact the claims team.' : 'The upload stopped. Check your connection and try again.', 0);
  }
  return api<T>(url, { body: { ...fields, uploads } });
}

function uploadForm<T>(url: string, files: File[], onProgress: (share: number) => void, fields: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.append(name, value));
    files.forEach((file) => form.append('files', file));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api${url}`);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onerror = () => reject(new ApiError('The upload stopped. Check your connection and try again.', 0));
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // The error below covers an unreadable reply.
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.error ?? 'The upload failed. Try again.', xhr.status));
    };
    xhr.send(form);
  });
}

export type Field = { key: string; label: string; value: string; page: number; quote: string; confidence: string; corrected?: boolean };
export type Doc = {
  id: string; filename: string; mime: string; size: number; origin: string; status: string; error: string;
  docType: string | null; typeLabel: string | null; typeSetBy: string | null; confidence: string | null; language: string;
  handwritten: boolean; description: string; issues: string[]; fields: Field[]; lineItems: { description: string; amount: string }[]; createdAt: string;
};
export type Flag = { id: string; origin: string; severity: string; title: string; detail: string; documentIds: string[]; status: string; note: string; resolvedBy: string | null };
export type Quote = {
  documentId: string; filename: string; supplier: string; number: string; date: string; totalText: string; itemCount: number; addsUp: boolean | null; sumText: string;
  registration: string; vehicleMatches: boolean | null; leavesOut: string[]; onlyThisOne: string[]; readingIssues: string[];
};
export type Insights = {
  comparison: { quotes: Quote[]; rows: { work: string; prices: { document_id: string; amount: string }[] }[]; suggestion: { documentId: string; reasons: string[] } | null; noSuggestion: string };
  value: { text: string; source: string };
  sumInsured: { text: string; over: boolean } | null;
  cover: { state: 'inside' | 'early' | 'outside' | 'unknown'; text: string };
  timeline: { date: string; labels: string[]; documentId: string; isLoss: boolean; daysAfterPrevious: number | null }[];
  daysToOpen: number | null;
  recheck: { documentId: string; filename: string; issues: string[] }[];
  languages: string[];
  handwritten: number;
};
export type Claim = {
  id: string; ref: string; classId: string | null; className: string | null; claimantName: string; contactEmail: string; contactPhone: string;
  policyNumber: string; vehicleReg: string; policyStart: string; policyEnd: string; lossDate: string; source: string; notes: string;
  stage: string; stageLabel: string; portalLink: string;
  summary: null | { overview: string; parties: { role: string; name: string }[]; dates: { label: string; value: string; document_id: string }[]; amounts: { label: string; value: string; document_id: string }[]; next_steps?: string[] };
  insights: Insights;
  draft: { subject: string; body: string; sentAt: string | null };
  analysisStatus: string; analysisError: string; analysedAt: string | null; handedOverAt: string | null; createdBy: string; createdAt: string;
  checklist: { type: string; label: string; required: boolean; documentIds: string[] }[]; documents: Doc[]; flags: Flag[];
};
export type ClaimRow = {
  id: string; ref: string; claimantName: string; policyNumber: string; vehicleReg: string; source: string; className: string | null;
  stage: string; stageLabel: string; createdAt: string; updatedAt: string; documents: number; missing: string[]; openFlags: number;
};
export type Meta = {
  documentTypes: Record<string, string>; stages: Record<string, string>; classes: { id: string; name: string }[]; ai: boolean; aiName: string; freeAiPlan: boolean; sending: boolean; directUploads: boolean;
};
export type User = { id: string; email: string; name: string; role: 'manager' | 'handler'; active: boolean };
export type Inbox =
  | { connected: false; acknowledge: boolean }
  | { connected: true; acknowledge: boolean; host: string; port: number; user: string; mailbox: string; connectedAt: string; lastCheck: string | null; lastError: string | null; lastAdded: number; checking: boolean };
