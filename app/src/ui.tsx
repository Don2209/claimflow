import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, LoaderCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Button({ variant = 'quiet', busy, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'main' | 'quiet' | 'danger'; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-small font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'main' && 'bg-primary text-on-primary hover:bg-primary-hover',
        variant === 'quiet' && 'border border-line-strong/50 bg-surface text-fg hover:bg-sunken',
        variant === 'danger' && 'border border-danger/50 bg-surface text-danger hover:bg-danger-soft',
        className,
      )}
    >
      {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export const inputClass =
  'block min-h-10 w-full rounded-md border border-line-strong/60 bg-surface px-3 py-2 text-small text-fg placeholder:text-muted/70 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-semibold text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-muted">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'danger' | 'ok'; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md px-3 py-2.5 text-small',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'ok' && 'bg-ok-soft text-ok',
      )}
    >
      {tone !== 'ok' && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const stageStyles: Record<string, string> = {
  new: 'border-line-strong text-muted',
  reading: 'border-accent text-accent',
  needs_person: 'border-danger text-danger',
  missing: 'border-warn text-warn',
  flagged: 'border-danger text-danger',
  ready: 'border-ok text-ok',
  handed_over: 'border-line-strong text-muted',
};

/** The rubber stamp on the front of a file. It is the one thing a handler reads from across the room. */
export function StageStamp({ stage, label, large }: { stage: string; label: string; large?: boolean }) {
  return (
    <span className={cn('inline-block whitespace-nowrap border-2 bg-surface/70 px-2 py-0.5 font-display font-extrabold uppercase leading-tight tracking-wide', large ? '-rotate-2 text-[1.35rem]' : 'text-[0.95rem]', stageStyles[stage])}>
      {label}
    </span>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-display-sm font-extrabold sm:text-[2.75rem]">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Sheet({ title, aside, children, className }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-sm bg-paper p-4 text-paper-ink shadow-paper sm:p-5', className)}>
      {title && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[1.4rem] font-extrabold leading-tight">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading() {
  return (
    <div className="flex items-center gap-2 py-16 text-muted" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Loading
    </div>
  );
}

export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const latest = useRef(load);
  latest.current = load;
  const reload = useCallback(async () => {
    try {
      setData(await latest.current());
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), deps);
  return { data, setData, error, reload };
}

export function DropZone({ onFiles, busy, progress, label, capture }: { onFiles: (files: File[]) => void; busy?: boolean; progress?: number; label: string; capture?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!busy) onFiles([...event.dataTransfer.files]);
      }}
      className={cn('rounded-md border-2 border-dashed p-5 text-center transition-colors', over ? 'border-accent bg-sunken' : 'border-line-strong/50')}
    >
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept=".pdf,image/jpeg,image/png,image/webp"
        aria-label={label}
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
      {busy ? (
        <div role="status">
          <p className="text-small font-semibold">Uploading{progress !== undefined ? ` ${Math.round(progress * 100)}%` : ''}</p>
          <div className="mx-auto mt-2 h-1.5 max-w-60 overflow-hidden rounded-full bg-sunken">
            <div className="h-full bg-accent transition-all" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </div>
        </div>
      ) : (
        <>
          <Button variant="main" onClick={() => input.current?.click()}>
            <Upload className="size-4" aria-hidden="true" /> {label}
          </Button>
          <p className="mt-2 text-caption text-muted">
            {capture ? 'Take photos or choose files. ' : 'Or drop files here. '}PDF, JPEG, PNG or WebP, up to 25 MB each.
          </p>
        </>
      )}
    </div>
  );
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const formatTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
