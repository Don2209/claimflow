import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '@/components/Logo';
import { api, uploadFiles } from '../api';
import { DropZone, Loading, Notice, useLoad } from '../ui';

/** Where a client starts a claim. There is nothing to fill in: they upload, and the AI takes the details from the documents. */
export function PublicClaim() {
  const navigate = useNavigate();
  const { data, error: loadError } = useLoad(() => api<{ testOnly: boolean }>('/public/claim-form'));
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  // Left empty by people, and filled in by spam bots.
  const website = useRef<HTMLInputElement>(null);

  async function send(files: File[]) {
    if (!files.length) return;
    setProgress(0);
    setError('');
    try {
      const { token, rejected } = await uploadFiles<{ token: string; rejected: string[] }>(
        '/public/claims', files, setProgress, { consent: String(consent), website: website.current?.value ?? '' },
      );
      navigate(`/upload/${token}?new=1`, { state: { rejected } });
    } catch (err) {
      setError((err as Error).message);
      setProgress(null);
    }
  }

  return (
    <div className="ink min-h-dvh bg-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <header className="mb-5"><p className="inline-flex items-center gap-2 font-display text-[1.6rem] font-extrabold text-fg"><LogoMark /> ClaimsFlow</p></header>
        <main className="daylight bg-paper p-5 text-paper-ink shadow-window sm:p-7">
          <h1 className="font-display text-display-sm font-extrabold">Send your claim documents</h1>
          <p className="mb-4 mt-1 text-small text-muted">Upload everything you have: claim form, ID, photos, quotes, reports. There's no form to fill in. We read your documents and tell you if anything is missing.</p>
          {loadError && !data ? <Notice tone="danger">{loadError}</Notice> : !data ? <Loading /> : (
            <div className="grid gap-4">
              {data.testOnly && <Notice><strong>Test service: use fictional documents only.</strong> Please do not upload real personal details or real claims.</Notice>}
              {error && <Notice tone="danger">{error}</Notice>}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label>Website<input ref={website} tabIndex={-1} autoComplete="off" /></label>
              </div>
              <label className="flex items-start gap-2.5 text-small">
                <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[rgb(var(--accent))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I agree that my documents go to the claims team, and that an AI service helps sort and read them. A person makes every decision on my claim.</span>
              </label>
              <DropZone capture disabled={!consent} label="Add documents" busy={progress !== null} progress={progress ?? 0} onFiles={send} />
              {!consent && <p className="-mt-2 text-caption text-muted">Tick the box above to add your documents.</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
