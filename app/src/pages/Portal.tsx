import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { api, uploadFiles } from '../api';
import { DropZone, Loading, Notice, useLoad } from '../ui';

type View = { ref: string; reading: number; received: number; checklist: { label: string; required: boolean; received: boolean }[] };

export function Portal() {
  const { token } = useParams();
  const { data, error, reload } = useLoad(() => api<View>(`/portal/${token}`), [token]);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!data?.reading) return;
    const timer = setInterval(() => void reload(), 3000);
    return () => clearInterval(timer);
  }, [data?.reading, reload]);

  async function add(files: File[]) {
    if (!files.length) return;
    setProgress(0);
    setProblem('');
    setMessage('');
    try {
      const result = await uploadFiles(`/portal/${token}/documents`, files, setProgress);
      if (result.added.length) setMessage(`Received: ${result.added.join(', ')}. Thank you.`);
      if (result.rejected.length) setProblem(result.rejected.join(' '));
      await reload();
    } catch (err) {
      setProblem((err as Error).message);
    }
    setProgress(null);
  }

  return (
    <div className="ink min-h-dvh bg-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <header className="mb-5"><p className="inline-flex items-center gap-2 font-display text-[1.6rem] font-extrabold text-fg"><LogoMark /> ClaimsFlow</p></header>
        <main className="daylight bg-paper p-5 text-paper-ink shadow-window sm:p-7">
          {error && !data ? <Notice tone="danger">{error}</Notice> : !data ? <Loading /> : (
            <>
              <h1 className="font-display text-display-sm font-extrabold">Documents for claim <span className="tabular whitespace-nowrap">{data.ref}</span></h1>
              <p className="mb-4 mt-1 text-small text-muted">Add what you have. Phone photos are fine, as long as the whole page is in the picture and it can be read.</p>
              <div className="mb-3 grid gap-2">
                {message && <Notice tone="ok">{message}</Notice>}
                {problem && <Notice tone="danger">{problem}</Notice>}
              </div>
              <DropZone capture label="Add documents" busy={progress !== null} progress={progress ?? 0} onFiles={add} />
              {data.checklist.length > 0 && (
                <>
                  <h2 className="mb-2 mt-6 font-display text-[1.4rem] font-extrabold">What we need</h2>
                  <ul className="grid gap-1.5" aria-live="polite">
                    {data.checklist.map((item) => (
                      <li key={item.label} className="flex items-center gap-2.5 text-small">
                        <span className={cn('grid size-6 shrink-0 place-items-center rounded-sm border-2', item.received ? 'border-ok bg-ok-soft text-ok' : 'border-line-strong')}>
                          {item.received && <Check className="size-4" strokeWidth={3} aria-label="Received" />}
                        </span>
                        {item.label}{!item.required && <span className="text-muted">(if you have it)</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {data.reading > 0 && <p className="mt-3 text-caption text-muted" role="status">Checking what you sent. The list updates by itself.</p>}
              <p className="mt-6 border-t border-line pt-3 text-caption text-muted">This private link is only for this claim, so please do not share it. Documents go to the claims team, and AI helps sort them. A person makes every decision.</p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
